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
