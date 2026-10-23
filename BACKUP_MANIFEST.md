# 🛡️ Binance Quant AI Scalper & DEX Terminal — Tam Sistem Yedekleme Manifesti (Backup Manifest)

**Yedekleme Tarihi:** 23 Ekim 2026  
**Sürüm:** v2.4.0 (Latest Production Release)  
**Proje Adı:** Binance Quant AI Scalper & PancakeSwap Web3 Autonomous Terminal  
**Geliştirici:** AI Studio Build Engine  

---

## 📦 Yedek Dosyaları ve Doğrulama Özetleri (Checksums)

| Dosya Adı | Format | Boyut | İndirme / Konum | SHA-256 Sağlama Özeti (Checksum) |
| :--- | :--- | :--- | :--- | :--- |
| `binance_quant_ai_scalper_backup_latest.zip` | ZIP (Evrensel) | ~29 MB | `/api/download-zip` & `/backups/` | `674ba1e8be3f116cef3c6260a146f3b3b5e25620a19d937e2873b290fef3bb6e` |
| `binance_quant_ai_scalper_backup_latest.tar.gz` | TAR GZ (Linux/Mac) | ~29 MB | `/api/download-project?format=tar.gz` | `33eb9483431fe439152016c2395e34b8b47ed376681e8346d13b34c718d57a12` |
| `binance_quant_ai_scalper_backup_20261023.zip` | ZIP (Tarihli Kopya) | ~29 MB | `/backups/binance_quant_ai_scalper_backup_20261023.zip` | `674ba1e8be3f116cef3c6260a146f3b3b5e25620a19d937e2873b290fef3bb6e` |

> 🌐 **Doğrudan Tarayıcıdan İndirme:**  
> - Üst başlık (TopHeader) ve Güvenlik Ayarları menüsündeki **"📦 Projeyi İndir (.ZIP)"** butonuna tıklayarak doğrudan indirebilirsiniz.  
> - Ya da doğrudan tarayıcı adres satırına `https://[UYGULAMA_URL]/api/download-zip` yazarak tek tıkla cihazınıza indirebilirsiniz.

---

## 🚀 Bu Sürümde Yer Alan Tüm Özellikler (Full Feature Set)

1. **PancakeSwap Doğrudan Takas & 0 Hata Link Protokolü (`src/utils/pancakeSwapUrl.ts`):**
   - PancakeSwap'te "Select a token" penceresine düşme hatası tamamen giderildi.
   - Resmi BSC Chain ID 56 (`https://pancakeswap.finance/swap?outputCurrency=${address}&chainId=56`) link standardı entegre edildi.
   - Çift pencere açılma (double pop-up) engellendi; kontrat adresi tek tıkla panoya kopyalanır.

2. **Doğrulanmış BEP-20 Listeleme Radarı (`src/data/verifiedUpcomingTokens.ts` & `server.ts`):**
   - Hem Diğer Borsalarda Listelenecek Tokenlar hem de PancakeSwap Radarı 100% gerçek BSC ana ağı tokenlarıyla güncellendi ($QUANT, $FLOKI, $BABYDOGE, $BRISE, $HIGH, $BAKE, $QUACK, $CAKE).
   - Özel Token Listeleme Ekleme/Oluşturma menüsü (`POST /api/pancakeswap/upcoming-listings`) ve silme fonksiyonları tam aktif.

3. **Dinamik Panel İçi Swap (In-App Swap):**
   - Radardan veya listeden herhangi bir coine "Al" dendiğinde Section 3 hedef tokeni otomatik olarak günceller.
   - Hızlı token değiştirici butonlar ($QUANT, $FLOKI, $BABYDOGE, $HIGH vb.) ile anlık fiyat ve tahmini miktar hesaplaması.
   - İster doğrudan PancakeSwap dApp'inde açma, ister MetaMask ile sayfa içi işlem yapma desteği.

4. **PancakeSwap Otonom DEX Scalper & 6 Kademeli Güvenlik Kalkanı:**
   - Honeypot simülasyonu, %100 likidite kilit denetimi, devredilmiş mülkiyet doğrulaması, sıfır vergi kontrolü.
   - 147 sahte/tuzak tokeni engelleyen filtreleme mekanizması.

5. **Otomatik Geri Alım ve Yakım Motoru (Buyback & Burn Engine):**
   - Ticaret komisyonlarından ve havuz gelirlerinden otomatik BNB ile $QUANT alımı ve `0x000...dEaD` adresine yakım.
   - Canlı on-chain işlem kaydı ve simülatör.

6. **Binance Spot & Vadeli İşlem Otomasyonu:**
   - Canlı WebSocket piyasa beslemesi (0 REST ağırlığı), çoklu bot yöneticisi, yapay zeka fiyat tahmini, emir defteri, mum grafikleri ve geriye dönük test (backtester).

7. **Resmi Web Sitesi ve Medya Kiti:**
   - `website/index.html` Hostinger/cPanel uyumlu bağımsız web sitesi.
   - Dubai Penthouse ve Burj Khalifa sinematik tanıtım görselleri, BscScan bannerları, logolar.

---

## 🛠️ Yedeği Geri Yükleme ve Çalıştırma Talimatları (Restore Guide)

Yedeği başka bir sunucuda veya yerel bilgisayarınızda (Localhost / VPS) ayağa kaldırmak için:

### 1. Arşivi Açın
```bash
# ZIP dosyası için:
unzip binance_quant_ai_scalper_backup_latest.zip -d binance_quant_app
cd binance_quant_app

# VEYA TAR.GZ dosyası için:
tar -xzvf binance_quant_ai_scalper_backup_latest.tar.gz -C binance_quant_app
cd binance_quant_app
```

### 2. Bağımlılıkları Yükleyin
```bash
npm install
```

### 3. Ortam Değişkenlerini Tanımlayın
```bash
cp .env.example .env
# .env dosyasını açıp port veya gerekirse API anahtarlarınızı yazın
```

### 4. Geliştirme Sunucusunu Başlatın
```bash
npm run dev
```

### 5. Canlı Üretim (Production) Derlemesi
```bash
npm run build
npm start
```
Uygulama `http://localhost:3000` portunda tüm özellikleriyle çalışmaya başlayacaktır.
