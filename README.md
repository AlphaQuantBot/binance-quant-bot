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

## 💎 $QUANT Token & Web3 Ekosistemi (BNB Chain BEP-20)

Projenin yerel fayda, staking ve yakım tokeni olan **$QUANT**, BNB Smart Chain üzerinde üretilmiştir:

* 💎 **Sözleşme Adresi (Contract):** [`0x397397895fac99de11f5893bc46e32324d313d92`](https://bscscan.com/token/0x397397895fac99de11f5893bc46e32324d313d92)
* 📄 **Akıllı Sözleşme Kodu:** [`contracts/QuantToken.sol`](contracts/QuantToken.sol)
* 📘 **Resmi Whitepaper:** [`WHITEPAPER.md`](WHITEPAPER.md)
* 🚀 **5-Dakikada Dağıtım Rehberi:** [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md)
* 🗳️ **CoinSniper Resmi Oylama:** [`coinsniper.net/coin/94828`](https://coinsniper.net/coin/94828)
* 🪙 **Sabit Toplam Arz:** `100,000,000 QUANT` (Ekstra basım yetkisi yoktur)
* 🔥 **Buyback & Burn:** Borsa al-sat komisyonlarının %50'si ile piyasadan $QUANT satın alınıp kalıcı olarak yakılır.
* 🏆 **VIP Staking Kademeleri:** Cüzdanda $QUANT tutarak Erken Gem Radarı ve Balina Alarmlarını ücretsiz açma hakkı.

---

## 🎁 %20 Komisyon İndirimiyle Kaydolun & Ücretsiz Kullanın

Bu bot platformunu **ömür boyu ücretsiz** kullanmak ve borsa işlemlerinizde en düşük komisyon oranlarından faydalanmak için resmi Binance referans bağlantımızla kayıt olabilirsiniz:

* 🔗 **Referans Bağlantısı:** [Binance %20 İndirimli Kayıt Linki](https://accounts.binance.com/en/register?ref=XADYK9G1)
* 🏷️ **Referans Kodu:** `XADYK9G1`
* 💬 **Resmi Telegram Topluluğumuz:** [https://t.me/+6Fdw5kR4SJE2ZjU0](https://t.me/+6Fdw5kR4SJE2ZjU0)

---

## 🚀 Hızlı Kurulum (Quick Start)

### Gereksinimler
* [Node.js](https://nodejs.org/) v18.0.0 veya üzeri
* Binance veya Binance TR hesabı

### 1. Repoyu Klonlayın
```bash
git clone https://github.com/AlphaQuantBot/binance-quant-bot.git
cd binance-quant-bot
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
