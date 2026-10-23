# 🚀 $QUANT Token 5-Dakikada Dağıtım Rehberi (Deployment Guide)

Bu rehber, **$QUANT (Binance Quant Scalper Token)** akıllı sözleşmesini **BNB Smart Chain (BEP-20)** üzerinde 5 dakikada, sıfır kodlama bilgisiyle nasıl hayata geçireceğinizi anlatır.

---

## 🛠️ Gereksinimler

1. **MetaMask Cüzdanı:** Tarayıcınızda MetaMask eklentisi kurulu olmalı.
2. **BNB Smart Chain Ağı:** MetaMask'ta BNB Chain ağı seçili olmalı.
3. **Az Miktarda BNB (Gas Fee):** Sözleşmeyi zincire kaydetmek için cüzdanınızda **yaklaşık 0.005 - 0.01 BNB (1 - 3 Dolar)** bulunması yeterlidir.

*(İsterseniz önce **BSC Testnet** üzerinde tamamen ÜCRETSİZ test BNB ile deneyebilirsiniz).*

---

## 📋 Adım Adım Dağıtım (Remix IDE İle):

### 1. Adım: Remix IDE'yi Açın
* Tarayıcınızda resmi akıllı sözleşme derleyicisi olan **[remix.ethereum.org](https://remix.ethereum.org)** adresine gidin.

### 2. Adım: Sözleşme Dosyasını Oluşturun
1. Sol menüdeki dosya simgesine tıklayın.
2. `contracts` klasörünün üstüne gelip **"New File"** (Yeni Dosya) simgesine basın.
3. Dosya adını **`QuantToken.sol`** yapın.
4. Projemizdeki [`contracts/QuantToken.sol`](contracts/QuantToken.sol) dosyasının tüm kodlarını kopyalayıp buraya yapıştırın.

### 3. Adım: Derleme (Compile)
1. Sol taraftaki menüden **"Solidity Compiler"** (3. simge - "S" logolu) sekmesine tıklayın.
2. Compiler versiyonunu **`0.8.20`** (veya üzeri) seçin.
3. Mavi renkli **"Compile QuantToken.sol"** butonuna basın. (Yeşil tik işareti çıkacaktır).

### 4. Adım: Blokzincire Yükleme (Deploy)
1. Sol menüdeki en alttaki **"Deploy & Run Transactions"** (Ethereum logolu) sekmesine tıklayın.
2. **ENVIRONMENT** kutusundan **`Injected Provider - MetaMask`** seçeneğini seçin.
   * MetaMask cüzdanınız açılacak ve bağlanmanızı isteyecektir. Onaylayın.
3. **CONTRACT** açılır kutusunda **`QuantToken - contracts/QuantToken.sol`** seçili olduğundan emin olun.
4. Turuncu renkli **"Deploy"** butonuna tıklayın!
5. MetaMask açılacak ve ağ transfer ücretini (yaklaşık $0.50 - $1) onaylamanızı isteyecektir. **"Onayla" (Confirm)** deyin.

🎉 **TEBRİKLER! $QUANT TOKEN RESMİ OLARAK BLOKZİNCİRDE DOĞDU!**

---

## 🔍 Sözleşme Adresinizi (Contract Address) Alma & Görüntüleme

1. Dağıtım tamamlandığında Remix'in sol alt köşesindeki **"Deployed Contracts"** bölümünde sözleşmeniz belirecektir.
2. Oradaki kopyalama simgesine basarak **Token Sözleşme Adresinizi (0x...)** kopyalayın.
3. **[bscscan.com](https://bscscan.com)** adresine gidip arama kutusuna bu adresi yapıştırın:
   * Token Adı: `Binance Quant Scalper`
   * Sembol: `$QUANT`
   * Toplam Arz: `100,000,000 QUANT`
   olarak görüntülenecektir!

---

## 🥞 PancakeSwap'te Alım-Satım Havuzu (Liquidity) Açma

1. **[pancakeswap.finance](https://pancakeswap.finance)** adresine gidin ve MetaMask cüzdanınızı bağlayın.
2. **Trade > Liquidity > Add Liquidity** bölümüne gidin.
3. 1. Token olarak: **BNB** seçin.
4. 2. Token olarak: Kopyaladığınız **$QUANT sözleşme adresini** yapıştırıp $QUANT'ı seçin.
5. Havuz için ayırmak istediğiniz BNB ve $QUANT miktarını girip onaylayın.

Artık dünyanın her yerindeki yatırımcılar PancakeSwap üzerinden $QUANT tokeninizi alıp satabilir!
