# Kalkaneus

<div align="center">

![Kalkaneus Logo](./src/images/logo.png)

**Open-Source Web Security Testing Platform | Açık Kaynak Web Güvenlik Test Platformu**

[kalkaneus.com](https://kalkaneus.com)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-28.0.0-blue.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)

[🇬🇧 English](#-english) | [🇹🇷 Türkçe](#-türkçe)

</div>

---

## 🇬🇧 English

This project is developed as an **open-source web security testing platform**. My goal is to provide security researchers and penetration testing professionals with a free, powerful, and modern tool.

### 🚀 Overview

Kalkaneus is a professional-grade MITM (Man-in-the-Middle) proxy tool built with Electron and Node.js. It offers HTTP/HTTPS traffic interception, analysis, and manipulation capabilities for penetration testers, red team operators, and security researchers.

### ✨ Features

- **🔒 MITM Proxy**: HTTP/HTTPS traffic interception with automatic CA certificate generation
- **🔄 Repeater**: Manually modify and resend requests
- **⚡ Intruder**: Automated fuzzing engine (Sniper attack support)
- **🛡️ Scanner**: YAML-based vulnerability scanner (50+ templates)
- **📝 Decoder**: Multi-format support (Base64, URL, Hex, etc.)
- **📊 Logger**: Comprehensive HTTP traffic logging, filtering, and export
- **🔍 Search & Highlight**: Powerful search and highlighting with Monaco Editor
- **🎨 Modern UI**: Dark-themed, responsive design with React and Tailwind CSS
- **💾 Project Management**: Project save/load support
- **🔧 Collaborator**: Out-of-band interaction testing
- **📋 Comparer**: Request/response comparison tool

### ⚠️ Legal Notice

**IMPORTANT**: This tool is designed **for authorized security testing only**. Unauthorized traffic interception is illegal. Always ensure you have explicit permission before using this tool.

**Disclaimer**: The developers are not responsible for misuse of this tool. Users are solely responsible for complying with local laws.

### 📋 Requirements

- Node.js 18+
- npm or yarn
- Windows, macOS, or Linux

### 🛠️ Installation

```bash
# Clone the repository
git clone https://github.com/huseyinstif/kalkaneus.git
cd kalkaneus

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

### 🚦 Getting Started

1. **CA Certificate Setup**
   - Launch Kalkaneus
   - Go to Dashboard
   - Click "Download CA Certificate"
   - Install the certificate in your browser or operating system

2. **Proxy Settings**
   - Host: `127.0.0.1`
   - Port: `8080` (default)

3. **Start the Proxy**
   - Configure proxy settings from Dashboard
   - Click "Start Proxy"
   - View captured traffic from the Proxy tab

### 🤝 Contributing

We welcome contributions! Please read the contribution guidelines before submitting a PR.

1. Fork the project
2. Create a feature branch
3. Commit your changes
4. Push your branch
5. Open a Pull Request

### 📝 License

This project is licensed under the MIT License.

### 💭 Project Story

After an accident that broke both of my heels, I'm still in the recovery process. To commemorate this journey and contribute to the community during this time, I'm offering this project named **"Kalkaneus"** (the Latin name for the heel bone) to you for free.

---

## 🇹🇷 Türkçe

Bu proje **açık kaynak bir web güvenlik test platformu** olarak geliştirilmiştir. Amacım, güvenlik araştırmacılarına ve penetrasyon test uzmanlarına ücretsiz, güçlü ve modern bir araç sunmaktır.

### 🚀 Genel Bakış

Kalkaneus, Electron ve Node.js ile geliştirilmiş profesyonel seviyede bir MITM (Man-in-the-Middle) proxy aracıdır. Penetrasyon test uzmanları, red team operatörleri ve güvenlik araştırmacıları için HTTP/HTTPS trafiğini yakalama, analiz etme ve manipüle etme özellikleri sunar.

### ✨ Özellikler

- **🔒 MITM Proxy**: Otomatik CA sertifikası oluşturma ile HTTP/HTTPS trafiğini yakalama
- **🔄 Repeater**: İstekleri manuel olarak değiştirme ve yeniden gönderme
- **⚡ Intruder**: Otomatik fuzzing motoru (Sniper attack desteği)
- **🛡️ Scanner**: YAML-tabanlı zafiyet tarayıcı (50+ template ile)
- **📝 Decoder**: Çoklu format desteği (Base64, URL, Hex, vb.)
- **📊 Logger**: Kapsamlı HTTP trafik kaydı, filtreleme ve dışa aktarma
- **🔍 Search & Highlight**: Monaco Editor ile güçlü arama ve vurgulama
- **🎨 Modern Arayüz**: React ve Tailwind CSS ile karanlık temalı, responsive tasarım
- **💾 Project Management**: Proje kaydetme/yükleme desteği
- **🔧 Collaborator**: Out-of-band etkileşim testi
- **📋 Comparer**: İstek/yanıt karşılaştırma aracı

### ⚠️ Yasal Uyarı

**ÖNEMLİ**: Bu araç **yalnızca yetkili güvenlik testleri** için tasarlanmıştır. Yetkisiz trafik yakalama yasadışıdır. Bu aracı kullanmadan önce mutlaka açık izin aldığınızdan emin olun.

**Sorumluluk Reddi**: Geliştiriciler, bu aracın kötüye kullanımından sorumlu değildir. Kullanıcılar, yerel yasalara uymaktan tamamen sorumludur.

### 📋 Gereksinimler

- Node.js 18+
- npm veya yarn
- Windows, macOS veya Linux

### 🛠️ Kurulum

```bash
# Repoyu klonlayın
git clone https://github.com/huseyinstif/kalkaneus.git
cd kalkaneus

# Bağımlılıkları yükleyin
npm install

# Geliştirme modunda çalıştırın
npm run dev

# Production için derleyin
npm run build
```

### 🚦 Başlangıç

1. **CA Sertifikası Kurulumu**
   - Kalkaneus'u başlatın
   - Dashboard'a gidin
   - "Download CA Certificate" butonuna tıklayın
   - Sertifikayı tarayıcınıza veya işletim sisteminize kurun

2. **Proxy Ayarları**
   - Host: `127.0.0.1`
   - Port: `8080` (varsayılan)

3. **Proxy'yi Başlatın**
   - Dashboard'dan proxy ayarlarını yapılandırın
   - "Start Proxy" butonuna tıklayın
   - Proxy sekmesinden yakalanan trafiği görüntüleyin

### 🤝 Katkıda Bulunma

Katkılarınızı bekliyoruz! PR göndermeden önce lütfen katkı kurallarını okuyun.

1. Projeyi fork edin
2. Feature branch oluşturun
3. Değişikliklerinizi commit edin
4. Branch'inizi push edin
5. Pull Request açın

### 📝 Lisans

Bu proje MIT Lisansı altında lisanslanmıştır.

### 💭 Proje Hikayesi

Yaşadığım bir kaza sonucu topuklarımın ikisi de kırıldı ve hala iyileşmeye çalışıyorum. Bu süreci hatırlamak ve topluluğa bu süreçte fayda sağlamak adına topuk kemiğinin latince adı olan **"Kalkaneus"** projemi sizlere sunuyorum.

### 🙏 Teşekkürler | Acknowledgments

Bu projenin geliştirilmesinde desteklerini esirgemeyen değerli arkadaşlarıma teşekkür ederim:

Special thanks to the amazing people who supported this project:

<table>
  <tr>
    <td align="center">
      <a href="https://www.linkedin.com/in/tugayaslan-1995/" target="_blank">
        <img src="https://media.licdn.com/dms/image/v2/D4D03AQFN2PNBq5QPtQ/profile-displayphoto-shrink_400_400/profile-displayphoto-shrink_400_400/0/1716106694956?e=1764201600&v=beta&t=lGsfrmFHNCwAUBNmjt1JLTIl2nzmkwaGt1UAxgrCR1o" width="80px;" alt="Tugay Aslan"/><br />
        <sub><b>Tugay Aslan</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/mehmethafif" target="_blank">
        <img src="https://github.com/mehmethafif.png" width="80px;" alt="Mehmet Hafif"/><br />
        <sub><b>Mehmet Hafif</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/nrzky" target="_blank">
        <img src="https://github.com/nrzky.png" width="80px;" alt="Onur Özkaya"/><br />
        <sub><b>Onur Özkaya</b></sub>
      </a>
    </td>
  </tr>
  <tr>
    <td align="center">
      <a href="https://github.com/huseyingulsin" target="_blank">
        <img src="https://github.com/huseyingulsin.png" width="80px;" alt="Hüseyin Gülşin"/><br />
        <sub><b>Hüseyin Gülşin</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="#" target="_blank">
        <img src="https://static01.nyt.com/images/2013/03/24/business/24-UNBOX/24-UNBOX-superJumbo.jpg?quality=75&auto=webp" width="80px;" alt="Mustafa Emrah Ünsür"/><br />
        <sub><b>Mustafa Emrah Ünsür</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/tugaydmrl" target="_blank">
        <img src="https://github.com/tugaydmrl.png" width="80px;" alt="Tugay Demirel"/><br />
        <sub><b>Tugay Demirel</b></sub>
      </a>
    </td>
  </tr>
</table>

---

<div align="center">

**Made with ❤️ by [Hüseyin Tıntaş](https://www.linkedin.com/in/huseyintintas/)**

</div>