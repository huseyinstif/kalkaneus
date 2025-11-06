export class MatchReplaceEngine {
  applyRules(data, rules, type) {
    if (!rules || rules.length === 0) {
      return data;
    }

    const activeRules = rules.filter(rule => 
      rule.enabled && 
      (rule.type === 'both' || rule.type === type)
    );

    if (activeRules.length === 0) {
      return data;
    }

    const modifiedData = { ...data };

    for (const rule of activeRules) {
      try {
        if (rule.target === 'url' && modifiedData.url) {
          modifiedData.url = this.applyRule(modifiedData.url, rule);
        } else if (rule.target === 'headers' && modifiedData.headers) {
          modifiedData.headers = this.applyRuleToHeaders(modifiedData.headers, rule);
        } else if (rule.target === 'body' && modifiedData.body) {
          modifiedData.body = this.applyRule(modifiedData.body, rule);
        }
      } catch (error) {
        console.error('Error applying match & replace rule:', error);
      }
    }

    return modifiedData;
  }

  applyRule(text, rule) {
    if (rule.matchType === 'regex') {
      const flags = rule.caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(rule.match, flags);
      return text.replace(regex, rule.replace);
    } else {
      // Simple string replacement
      if (rule.caseSensitive) {
        return text.split(rule.match).join(rule.replace);
      } else {
        const regex = new RegExp(rule.match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        return text.replace(regex, rule.replace);
      }
    }
  }

  applyRuleToHeaders(headers, rule) {
    const modifiedHeaders = { ...headers };

    if (rule.headerName) {
      // For header rules, match by header name and replace entire value
      for (const [key, value] of Object.entries(modifiedHeaders)) {
        if (key.toLowerCase() === rule.headerName.toLowerCase()) {
          // Replace entire header value
          modifiedHeaders[key] = rule.replace;
        }
      }
      
      // If header doesn't exist and replace value is not empty, add it
      const headerExists = Object.keys(modifiedHeaders).some(
        k => k.toLowerCase() === rule.headerName.toLowerCase()
      );
      if (!headerExists && rule.replace) {
        modifiedHeaders[rule.headerName] = rule.replace;
      }
    } else {
      // Apply pattern matching to all header values
      for (const [key, value] of Object.entries(modifiedHeaders)) {
        modifiedHeaders[key] = this.applyRule(value, rule);
      }
    }

    return modifiedHeaders;
  }

  testRule(text, rule) {
    try {
      const result = this.applyRule(text, rule);
      return {
        success: true,
        original: text,
        modified: result,
        changed: text !== result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
