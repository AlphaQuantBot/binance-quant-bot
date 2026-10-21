# Sınırlı, emir göndermeyen karar izlemesi

Bu komut tek seferlik testnet:decision ile aynı gözlem fonksiyonunu kullanır.
Sinyal/hesap/deney kontrolü her döngüde taze veriden yeniden yapılır. Aday
oluşursa aynı yerel emir ve ücret incelemesi çalışır; hiçbir gönderici yoktur.
WebSocket her döngüde bağımsız açılır ve finally ile kapatılır. Okuma hatası
yeniden bağlantı veya sonraki otomatik deneme yerine oturumu durdurur.

Önceki 23c8bdd için operatör lint ve 16 karar/yerel inceleme testini geçti.
Gerçek testnet çıktı WAIT/HOLD ve orderReview NOT_APPLICABLE idi; gerçek bir
adayın yerel incelemesi henüz görülmedi. Bu gözlem o adayı beklemeyi sağlar,
aday üretmek için parametre veya yön zorlamaz.

## Kullanım

```powershell
git pull --ff-only
```

```powershell
npm.cmd run lint
```

```powershell
node --import tsx --test tests/scopedSignalDecision.test.ts tests/scopedSignalOrderReview.test.ts tests/scopedDecisionWatch.test.ts
```

Önce kısa gerçek deneme (3 gözlem, yaklaşık 2 dakika):

```powershell
npm.cmd run testnet:decision-watch -- 3
```

Daha sonra varsayılan 10 gözlem (yaklaşık 9 dakika):

```powershell
npm.cmd run testnet:decision-watch
```

Sayı 1–120 arasında olmalıdır; sıfır/sınırsız çalışma yoktur. Aynı testnet
anahtarları süreç ortamında tanımlı olmalıdır. Kurulum, başlangıç sermayesi
sıfırlama, yeni tahsis, emir rezervasyonu, order/test, POST veya iptal yoktur.
Var olan deney defteri yoksa durur. Mutabakat doğrulanmış eski sonuçları ya
da kalıcı haltı yerel olarak yazabilir; diske tamamen salt okunur değildir.

## Zamanlama ve durma

Mevcut sunucu dakikasına hizalama fonksiyonu kullanılır; 2 saniyelik yayın
payı ve okuma/kayıt/çıktı süresini düşen monotonic zaman hesabı korunur.
Döngüler seri çalışır, üst üste binmez. Ağ/uyku/gecikme nedeniyle atlanan
mumlar geriye dönük canlı gözlem sayılmaz.
BLOCKED karar, okuma/ücret/piyasa hatası, bozuk rapor, gerileyen zaman veya
aynı kapanışın değişen girdi hash'i tüm oturumu durdurur; tekrar deneme yoktur.
Ctrl+C devam eden HTTP okumalarını ve beklemeyi iptal eder, stream kapanır ve
kısmi özet üretilir. Zorla kapatma veya elektrik kesintisinde özet garanti edilmez.

## Özet

READ_ONLY_DECISION_WATCH_SUMMARY:
- requestedCycles: istenen döngü, attemptedCycles: başlanan okuma,
  completedCycles: geçerli rapor sayısı; BLOCKED raporu da tamamlanmış rapordur.
- uniqueCandles / duplicateObservations: zaman damgası olan raporlardaki farklı
  mumlar ve aynı mumun tekrar okunması.
- signals / uniqueCandidateCandles: her mumun oturumdaki ilk geçerli
  raporuna göre sayılar; aynı mumdaki tekrarlar kesişim/adayı çoğaltmaz.
- decisionObservations / orderReviewObservations: bütün geçerli okuma
  raporları sayılır; tekrar okunan mum varsa bu sayılar uniqueCandles'ı aşabilir.
- missedWithinSession / gapEventsWithinSession: oturum içindeki gözlem
  boşlukları; önceki oturumdan önceki boşluk bu komutta ölçülmez.
- continuousObservedSession: en az iki farklı mum ve aralarında sıfır kayıp;
  tüm istenen döngülerin tamamlandığı anlamına gelmez. state ayrıca incelenmelidir.
- state COMPLETED / INTERRUPTED / STOPPED ve güvenli stopCode.
- persistedSession false: bu sürüm karar oturumunu ayrı dosyaya kaydetmez;
  raporlar/özet konsola yazılır, yeniden başlatma yeni oturumdur.
- executionAuthorized false, ordersSubmitted 0, automaticTradingEnabled false.

LOCAL_CHECKS_PASSED yalnızca yerel incelemedir. Tam hesap risk, ücret varlığı
rezervasyonu, borsa emir doğrulaması, kullanılmış tek seferlik deney ve
otomasyon engelleri korunur. Oturum sonunda yalnızca özet paylaşılabilir;
yerel inceleme geçtiyse ilgili aday bloğu da paylaşılmalıdır.

Doğrulama sınırı: bu düzenlemede konteyner kapalıydı. Aynı çekirdek kodu
60 sanal döngüde 60 farklı mum/sıfır kayıp üretti; bloke karar, hata sonrası
tekrar denememe ve iptal için toplam 12 V8 kontrolü geçti. Bunlar native
Node, gerçek ağ/Windows veya yeni TypeScript doğrulaması değildir. Eklenen
dokuz Node testi ve gerçek 3 döngü cihazda doğrulanmalıdır. Önceki 296 tam
test veya 16 hedefli test sonucu yeni kodun geçtiği anlamına gelmez.
