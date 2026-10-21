# Emir göndermeden sinyal gözlemi

İlk gerçek Spot Testnet döngüsü operatörün bilgisayarında tamamlandı:
0.0003 BTC alındı ve tamamı satıldı; gözlenen toplam komisyon sıfır,
gerçekleşmiş sonuç +0.007035 test USDT. Yeni süreçte bakiye 100.007035,
BTC sıfır, emir sayısı iki, belirsiz emir sıfır ve hesap tutarlıydı.
Bu, emir/mutabakat akışını doğrular; strateji performans ölçümü değildir.

Bu yeni araç başlangıç referansı olarak EMA20/EMA50 kesişimini gözlemler.
Üründeki AI/quant stratejilerinin uygulanması veya doğrulanması değildir.
Mevcut cryptoMath EMA hesabı kullanılır; her hesap son 120 kapanmış bir
 dakikalık mumla başlatılır. EMA başlangıcı ilk kapanış değeridir.
BUY_CROSS önceki EMA20 <= EMA50 ve son EMA20 > EMA50 olduğunda;
SELL_CROSS ters kesişimde; diğer durumlarda HOLD üretilir.
SELL_CROSS bir satış emri veya açık pozisyon iddiası değildir.

```powershell
git pull --ff-only
```

İlk olarak bir gözlem alın:

```powershell
npm.cmd run testnet:signals -- 1
```

Ardından birer dakika arayla 10 gözlem (yaklaşık 9 dakika):

```powershell
npm.cmd run testnet:signals
```

Ctrl+C durdurur. Döngü sayısı 1–120 arasında verilebilir; sürekli çalışmaz.
Anahtar gerekmez. Yalnızca testnet GET /api/v3/time ve GET /api/v3/klines
çağrıları vardır; hesap okuması, emir gönderimi veya iptali yoktur.
Resmi kaynak: https://developers.binance.com/en/docs/products/spot/testnet/rest-api

Kapanmamış mum endTime ile dışlanır. Tam 120 ardışık mum, zaman hizası,
OHLC/hacim tutarlılığı ve son kapanmış mumun sunucu dakikasıyla güncelliği
kontrol edilir. 15 saniyeyi aşan toplam okuma reddedilir. HTTP hatası veya
rate limit durumunda yeniden deneme ve başka kaynağa geçiş olmadan durur.

Kayıt `.testnet_scoped/signals.sqlite` içinde, deney emir defterinden ayrı
saklanır ve Git'e eklenmez. Aynı kapanış tekrar yazılmaz (`recorded:false`).
Aynı kapanışın girdi/sonucu değişirse durur. Kesinti sonrası geçmişte işlem
olmuş gibi kayıt üretmez: `observationGap` ve `missedCandles` kaybı gösterir.
Kayıt boşlukları olan oturum kesintisiz izleme kanıtı sayılmaz.

Çıktıda `signal`, EMA değerleri, `candleCloseTime`, `inputHash`, `recorded`
ve veri kaynağı bulunur. Emir sayısı her zaman sıfırdır. Sinyaller için
varsayımsal dolum, getiri, ücret veya kârlılık uydurulmaz. Ana ağ ve otomatik
emir yürütmesi kapalı kalır. Testnet likiditesi ana ağ performansı değildir.

## Dakika hizalama ve oturum özeti

Operatörün 60 gözleminde tüm sonuçlar HOLD idi. Başlangıçta önceki oturuma
göre bir mum, 24–25. döngüler arasında ayrıca bir mum eksikti. Yalnızca bu
çıktıyla kesintinin kesin nedeni belirlenemez.

Yeni zamanlama, okuma bitiminden sonra sabit 60 saniye beklemek yerine
sunucunun bir sonraki dakika sınırını ve 2 saniyelik yayın payını hedefler.
Kline okuma, SQLite kaydı ve çıktı süresi beklemeden düşülür. Böylece normal
okuma süreleri her döngüde birikmez. Ağ gecikmesi, bilgisayarın uyuması veya
zamanlayıcı gecikmesi yine boşluk yaratabilir; kesintisizlik garanti edilmez.
Eski mumları sonradan canlı gözlem gibi doldurmaz.

Her oturum sonunda READ_ONLY_SIGNAL_SESSION_SUMMARY çıkar:
- requestedCycles / completedCycles: istenen ve tamamlanan okumalar.
- uniqueCandles / newlyRecorded / duplicateObservations: benzersiz mumlar,
  yeni SQLite kayıtları ve aynı oturumda tekrar okunan mum sayısı.
- signals: benzersiz gözlemler için BUY_CROSS, SELL_CROSS ve HOLD sayıları.
- missedBeforeSession: ilk gözlemin önceki defter kaydına göre boşluğu.
- missedWithinSession / gapEventsWithinSession: bu oturumda gözlemlenen
  kapanışlar arasındaki eksik mumlar ve boşluk olayları.
- continuousObservedSession: en az iki benzersiz gözlem var ve arada eksik
  mum yok; istenen tüm döngülerin tamamlandığı anlamına gelmez.
- state: COMPLETED, INTERRUPTED veya STOPPED. Ctrl+C ve hatada kısmi özet
  üretilir; zorla süreç sonlandırma/güç kaybında özet garanti edilmez.

Bir sonraki denemede yalnızca son özet bloğunu paylaşmak yeterlidir.
İlk bekleme dakika hizasına göre değişir; sonraki normal okumalar dakika
başlangıcından yaklaşık 2 saniye sonrasına hedeflenir.

Doğrulama: 70 sanal saat/özet kontrolü ve 60 döngülük komut akışı simülasyonu
çalıştırıldı (60 benzersiz mum, sıfır oturum içi kayıp). Bu düzenleme sırasında
çalışma konteyneri yanıt vermediğinden tam Node test paketi, TypeScript ve
üretim derlemesi tekrar çalıştırılamadı. Önceki sürümün 290 başarılı testi
bu düzenlemenin tam doğrulaması olarak sunulmaz. Depoda yeni Node testleri
eklendi; yerelde kontrol:

```powershell
npm.cmd run lint
```

```powershell
npm.cmd run test:security
```
