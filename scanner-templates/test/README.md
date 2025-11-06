# Test Templates

Bu klasör test amaçlı template'ler için kullanılır.

## Template Oluşturma

Yeni bir template oluşturmak için `.yaml` veya `.yml` uzantılı dosya oluşturun:

```yaml
id: my-test-template

info:
  name: My Test Template
  author: Your Name
  severity: info  # critical, high, medium, low, info
  description: Template açıklaması
  tags: test,custom

http:
  - method: GET
    path:
      - "{{BaseURL}}/test"
    
    matchers:
      - type: status
        status:
          - 200
```

## Kullanım

1. Template'i bu klasöre kaydedin
2. Scanner sayfasında "Refresh Templates" butonuna tıklayın
3. Template'iniz "Test" kategorisinde görünecektir

## Örnekler

- `example-test.yaml` - Basit bir örnek template
