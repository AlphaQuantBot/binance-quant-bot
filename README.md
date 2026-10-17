# ⚡ Binance Autonomous Quant Scalper & Multi-Bot Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Binance](https://img.shields.io/badge/Binance_API-F0B90B?style=for-the-badge&logo=binance&logoColor=black)](https://www.binance.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg?style=for-the-badge)](LICENSE)

> **7/24 Kesintisiz Otonom Kripto Alım-Satım, Sert Parametre Filtresi ve Asla Zararına Satmayan Risk Kalkanı.**

---

## 🌟 Öne Çıkan Özellikler (Core Features)

### 1. 🛡️ Asla Zararına Satma Kalkanı (Zero Loss Defense)
* Sunucu ve istemci düzeyinde aktif başabaş maliyet takibi (`cost basis`).
* Binance borsa komisyonları (%0.10 alış + %0.10 satış) düşüldükten sonra **net kâr hedefine ulaşılmadıkça satış emri fiziksel olarak engellenir**.
* Piyasa çöküşlerinde veya ani iğnelerde eldeki varlıklar panikle zararına piyasaya boşaltılmaz; kâr hedefine kilitlenir.

### 2. 🎯 Sert Token Alım Filtresi & Kâr Potansiyeli Skoru
Botlar körü körüne rastgele veya aşırı şişmiş tokenleri almaz; 470+ Binance USDT paritesini 5 katmanlı filtreden geçirir:
* **💧 Likidite & Hacim Kalkanı:** 24 saatlik işlem hacmi en az **$2.5M USDT** olmayan pariteler elenir.
* **📈 Sağlıklı Momentum Sweet-Spot (+%1.5 - +%18.0):** Düşüşteki coinler ve tepe noktasından kâr satışı yeme riski yüksek aşırı alım (+%18+) FOMO coinleri elenir.
* **🏔️ Zirve Korunumu & Dump Engeli:** Günün zirvesinden (24h High) **%10'dan fazla geri çekilmiş** dağıtım aşamasındaki coinler elenir.
* **📊 Kanal Konumu:** Fiyat dip-tepe kanalının üst yarısında (%40-%96) ve alıcı hakimiyetinde olmalıdır.
* **🏆 Kâr Potansiyeli Puanlaması (0 - 100):** Yalnızca **Skor ≥ 70** alan ve en yüksek net kâr getirme ihtimali olan parite öncelikle seçilir.

### 3. 🤖 Otonom 4'lü Bot ve Portföy Risk Yönetimi
* 4 bağımsız bot portföyü dengeli altcoinlere dağıtır.
* **Tek Token Tavanı:** Kasanın maksimum %22'si tek tokene ayrılır (asla tüm kasa tek coin'e bağlanamaz).
* **Nakit Rezervi Koruması:** Kasanın en az %15'i nakitte serbest tutularak likidite korunur.
* **BNB Komisyon Kalkanı:** Komisyonlar BNB ile ödenerek %25 ek tasarruf sağlanır.

### 4. ⚡ 24/7 Kesintisiz Binance WebSocket Motoru
* REST API rate-limit ve IP engeli olmadan, Binance Global WebSocket akışıyla 750+ parite canlı izlenir.
* Sanal test (Paper Trading) ve Gerçek Canlı Borsa (Live API) modları arasında anında geçiş.

### 5. 🔍 Alpha Hacker Terminali & Erken Aşama Gem Radarı
* Henüz Binance'te listelenmemiş, DEX ve on-chain likiditesi kilitli erken aşama gem tespiti.
* Balina hareketleri ve sosyal duyarlılık analizi.

---

## 🎁 %20 Komisyon İndirimiyle Kaydolun & Ücretsiz Kullanın

Bu bot platformunu **ömür boyu ücretsiz** kullanmak ve borsa işlemlerinizde en düşük komisyon oranlarından faydalanmak için resmi Binance referans bağlantımızla kayıt olabilirsiniz:

* 🔗 **Referans Bağlantısı:** [Binance %20 İndirimli Kayıt Linki](https://accounts.binance.com/en/register?ref=XADYK9G1)
* 🏷️ **Referans Kodu:** `XADYK9G1`
* 💬 **Topluluk & Destek:** [Telegram VIP Grubumuz](https://t.me/BinanceQuantBotCommunity)

---

## 🚀 Hızlı Kurulum (Quick Start)

### Gereksinimler
* [Node.js](https://nodejs.org/) v18.0.0 veya üzeri
* Binance veya Binance TR hesabı

### 1. Repoyu Klonlayın
```bash
git clone https://github.com/KULLANICI_ADINIZ/binance-quant-scalper.git
cd binance-quant-scalper
```

### 2. Bağımlılıkları Yükleyin
```bash
npm install
```

### 3. Uygulamayı Başlatın
```bash
npm run dev
```
Tarayıcınızda `http://localhost:3000` adresine gidin.

---

## 🔑 Binance API Bağlantısı Nasıl Yapılır?

1. Binance hesabınıza giriş yapın ve **API Yönetimi** (API Management) sayfasına gidin.
2. Yeni bir API anahtarı oluşturun.
3. İzinler kısmında:
   * ✅ **Okuma İzni (Enable Reading)**: AÇIK
   * ✅ **Spot ve Margin Alım-Satım (Enable Spot & Margin Trading)**: AÇIK
   * ❌ **Para Çekme (Enable Withdrawals)**: **KESİNLİKLE KAPALI**
4. Programda sağ üstteki **"API Bağla"** veya **"Güvenlik & Ayarlar"** sekmesinden API Key ve Secret Key bilginizi girin.
5. İster Simülasyon (Paper) modunda test edin, isterseniz Canlı Modda botları devreye alın.

---

## 🔒 Güvenlik Standartları (Security First)

* **Sıfır Çekim Yetkisi:** Bot hiçbir zaman para çekme iznine ihtiyaç duymaz; paranız Binance güvencesindedir.
* **Lokal & Gizli Saklama:** API anahtarlarınız asla uzak bir üçüncü taraf sunucuya gönderilmez; yalnızca kendi yerel oturumunuzda ve şifreli depolanır.
* **Git Koruması:** `.gitignore` dosyası API anahtarlarını ve cüzdan verilerini içerebilecek yerel dosyaları otomatik olarak hariç tutar.

---

## ⚠️ Sorumluluk Reddi (Disclaimer)

*Bu yazılım eğitim ve algoritmik analiz amacıyla geliştirilmiştir. Kripto para piyasaları yüksek volatilite ve risk içerir. Geçmiş performans gelecekteki getirilerin garantisi değildir. Kullanıcılar kendi risk yönetimlerinden ve işlemlerinden bizzat sorumludur.*

---

## 📄 Lisans
Bu proje [MIT Lisansı](LICENSE) kapsamında lisanslanmıştır.
