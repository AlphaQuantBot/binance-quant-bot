# Emir göndermeyen sinyal–pozisyon karar gözlemi

Önceki Windows doğrulaması: operatör cf82587 üzerinde lint hatasız ve tam
pakette 296/296 başarılı, 0 atlanan test bildirdi. Gerçek testnet hesap
mutabakatı ready true / problems [] / openOrders [] olarak tamamlandı.
Deney defteri 100.007035 test USDT, ownedBTC 0, orderCount 2 ve
accountConsistent true sonucunu korudu. Bu kayıtlar yeni karar kodunun
test sonucu değildir; yeni sekiz testin doğrulaması ayrıca gerekir.

```powershell
git pull --ff-only
```

```powershell
npm.cmd run lint
```

```powershell
node --import tsx --test tests/scopedSignalDecision.test.ts
```

Kontroller geçerse aynı testnet anahtarları tanımlı PowerShell'de:

```powershell
npm.cmd run testnet:decision
```

Komut bir kez çalışır. Mevcut SQLite deney defterini açar; defter yoksa
oluşturmaz. Bekleyen emirleri yalnızca özgün kimlikleriyle sorgular;
belirsizlik çözülmezse durur. Testnet halka açık kapanmış mum verisi,
imzalı hesap/açık emir okumaları ve taze piyasa bağlamını kullanır.
Defter mutabakatı, doğrulanmış önceki gerçekleşmeleri veya kalıcı haltı
yerel olarak kaydedebilir; bu nedenle diske tamamen salt okunur değildir.
Borsaya emir, iptal veya order/test göndermez. Sinyal geçmişini değiştirmez;
karar raporu bu sürümde yalnızca konsola yazılır.

Hesabın önceki BTC bakiyesi satış miktarı sayılmaz. Yalnızca deney
defterinin ownedBTC alanı kullanılır:
- HOLD -> WAIT / NO_NEW_CROSS.
- BUY_CROSS ve deney BTC sıfır, kullanılabilir deney nakdi >=25 -> BUY adayı.
- BUY_CROSS ve deney pozisyonu var -> WAIT / EXPERIMENT_POSITION_ALREADY_OPEN.
- SELL_CROSS ve deney BTC sıfır -> WAIT / NO_EXPERIMENT_BTC_TO_SELL.
- SELL_CROSS ve deney BTC var -> SELL adayı.
- Halt, hesap tutarsızlığı, belirsiz emir, 5 USDT veya üzeri gözlenen
  deney kaybı, geçersiz ya da eski veri -> BLOCKED / aday yok.

Aday olması bir emir planı, risk onayı, miktar hesabı veya yürütme sinyali
değildir. proposedMaxOrderUSDT sadece mevcut 25 USDT öneri sınırıdır.
Emir filtreleri ve komisyon rezervasyonu bu komutta planlanmaz.
Her raporda executionAuthorized false, ordersSubmitted 0 ve
automaticTradingEnabled false kalır; ayrıca otomasyon, tam hesap günlük
risk ve emir/ücret doğrulama engelleri gösterilir.
Tamamlanmış sandbox_first_buy_v1 / sandbox_first_sell_v1 kimlikleri yeniden
kullanılamaz; ilgili adayda tek seferlik deneyin kullanıldığı ayrıca belirtilir.
Defter silme, tahsis sıfırlama veya yeni emir kimliği üretimi yoktur.

Bu gözlem sınıflandırıcısının sinyal yaşı sınırı 90 saniye, hesap mutabakatı
yaşı sınırı 5 saniyedir; gelecekteki veri reddedilir. Bunlar mevcut emir
gönderme/fiyat tazeliği eşiklerini değiştirmez. Sınıflandırıcı kapanmış
mumdan üretilen EMA20/50 referansını kullanır; AI stratejisi veya performans
ispatı değildir. Yeni bir aday oluşması için parametreler değiştirilmez.

Doğrulama sınırı: konteyner erişimi kapalı olduğundan yeni Node testleri,
TypeScript kontrolü ve üretim derlemesi burada çalıştırılamadı. Aynı saf
karar fonksiyonu 48 V8 kontrolünde (sinyal/pozisyon/halt/belirsizlik
kombinasyonları dahil) geçti. Bu gerçek Node/SQLite/borsa doğrulaması değildir.
Gerçek cihazdaki yeni test ve ilk karar çıktısı bekleniyor.
