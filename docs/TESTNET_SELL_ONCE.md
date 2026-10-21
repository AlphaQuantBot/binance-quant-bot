# Tek seferlik Spot Testnet satışı

Operatörün gerçek Spot Testnet alımı ve yeniden açma kontrolü doğrulandı:
0.0003 BTC, harcanan 24.943848 test USDT, gözlenen komisyon 0.
Yeniden açıldığında deney nakdi 75.056152 USDT ve BTC 0.0003 olarak
korundu; accountConsistent true, unresolvedOrders 0.
Bunlar operatör çıktılarıdır; aşağıdaki satış henüz operatörde denenmedi.

Aynı proje klasöründe, testnet anahtarlarının tanımlı olduğu PowerShell'de:

```powershell
git pull --ff-only
```

Aşağıdaki komut **gerçek Spot Testnet eşleştirme motoruna bir SELL LIMIT IOC
emri gönderebilir**; sanal bakiyeler kullanılır. Önceden var olan BTC'ye
satış miktarı olarak başvurmaz. Yalnızca yerel deney defterindeki BTC'den,
LOT_SIZE adımına aşağı yuvarlanarak ve emir başına 25 test USDT sınırında
miktar hesaplanır. Fiyat güncel alış kotasyonundan tick adımına aşağı
yuvarlanır; tüm mevcut fiyat, sembol, hesap ve komisyon kontrolleri geçmelidir.
Bu ilk çıkış adımı yalnızca doğrulanmış sıfır tam komisyon oranını destekler.

```powershell
npm.cmd run testnet:sandbox-sell-once
```

Bu komut alım oluşturmaz, döngü başlatmaz, sürekli zarar sınırı izlemez.
Halt, bakiye farkı, dış açık emir, belirsiz önceki emir veya ücret koşulu
uygun değilse gönderim durur. Mevcut durdurmalar satış için kaldırılmaz.

Satış kimliği sandbox_first_sell_v1 deney tahsisi başına sabittir.
Niyet ve gönderim hakkı SQLite FULL/WAL ile ağ çağrısından önce kaydedilir.
Bağlantı hatası, kayıp cevap, kısmi gerçekleşme, süre dolması veya yeniden
başlatma otomatik ikinci gönderime yol açmaz. Sonraki çağrı yalnızca mevcut
kimliği sorgular. Defter dosyasını silmeyin, başka defter yolu oluşturmayın.

- `state: CONFIRMED` emrin son durumunun doğrulandığını söyler; tek başına
  pozisyonun tümünün satıldığını söylemez. `orderStatus` ve miktarı inceleyin.
- `receivedUSDT` brüt doğrulanmış satış tutarıdır, `fees` ayrı gösterilir.
- `positionClosed: true` yalnızca deney BTC bakiyesi sıfırsa döner.
- `realizedResultUSDT` sadece tüm deney pozisyonu kapandığında, tüm doğrulanmış
  BTC/USDT komisyonları dahil kalan deney nakdi eksi ilk 100 USDT'dir.
  Kısmi kapanmada null kalır; kalan BTC'nin değerini gerçekleşmiş kâr saymaz.
- Fiyat artışı nedeniyle 25 USDT sınırı, lot yuvarlaması veya IOC kısmi
  gerçekleşmesi BTC bırakabilir. Bu sürüm kalan miktarı otomatik satmaz.
- Belirsizlikte RECONCILIATION_REQUIRED ve null sonuç döner; yeniden emir yoktur.

Sonrasında yalnızca okuma ile kalıcı kayıt ve hesap tutarlılığını kontrol edin:

```powershell
npm.cmd run testnet:sandbox-status
```

Otomatik işlem ve ana ağ yürütmesi kapalı kalır. Tek bir testnet alım–satım
sonucu strateji kârlılığı veya ana ağda hazır olma kanıtı değildir.
