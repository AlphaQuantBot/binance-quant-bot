# Referans fiyat tazeliği — karar izleme düzeltmesi

Operatörün ilk 3 döngülük gerçek izlemesi ilk okumada
STALE_REFERENCE_PRICE ile durdu; 0 tamamlanmış karar ve 0 emir vardı.
Yaş bilgisi önceki özette bulunmadığından kesin kök neden doğrulanmadı.

Kodda akıştan alınan referans, kitap isteği boyunca tutuluyordu. Örneğin
okunduğunda 1900 ms yaşında olan bir olay, kitap okuması 200 ms sürerse
2000 ms sınırını aşar; bu sırada akışa yeni olay gelmiş olabilir.

Değişiklik:
- TestnetReferenceStream.snapshot senkron ve yalnızca önbellekten okur.
  Bekleme, yeni socket, HTTP isteği, yeniden bağlanma veya yeniden deneme yoktur.
- Karar gözlemi referenceReader yanında bu callback'i adaptöre verir.
- Adaptör kitap yanıtından sonra en yeni önbellek olayını seçer, ardından
  mevcut fiyat/kitap/referans doğrulamalarını yapar.
- Gerçek exchange timestamp ve gerçek alım observedAt korunur; zaman yeniden
  damgalanmaz. Daha eski olay, aynı zamandaki değişmiş fiyat, null ile
  temizlenen cache, gelecek olay ve kopmuş stream reddedilir.
- Yaş sınırı 2000 ms ve read bekleme sınırı 4000 ms aynen korunur.
- Snapshot callback'i vermeyen diğer adaptör çağırıcılarının davranışı değişmez.
- Snapshot callback'i referenceReader olmadan yapılandırılamaz.

STALE_REFERENCE_PRICE hâlâ oluşabilir. Tek komut ve izleme özeti artık
referenceTiming gösterir: referenceKind, requestAgeMs, eventAgeMs.
Alanlar yalnızca bilinen ReferencePriceFreshnessError sınıfından alınır;
ham hata mesajı, fiyat, anahtar veya özel URL basılmaz.
Başarısız okuma yeniden denenmez; özet STOPPED kalır.

Doğrulama: eklenen cache seçme bloğu beş V8 kontrolünden geçti. Yeni üç
stream/adapter ve bir watch tanı testi eklendi. Native Node/Windows ve
gerçek borsa doğrulaması bu düzenleme için henüz çalıştırılmadı.
Yeni davranışın gerçek kullanıcı hatasını giderdiği henüz iddia edilmez.

```powershell
git pull --ff-only
```

```powershell
npm.cmd run lint
```

```powershell
npm.cmd run test:security
```

Kontroller geçerse:

```powershell
npm.cmd run testnet:decision-watch -- 3
```

Hata sürerse son özetin referenceTiming alanını paylaşın. Eşikler gevşetilmez,
REST referansa veya ortalama fiyata sessiz geçiş yapılmaz. Otomatik emir
gönderimi ve ana ağ kapalı kalır.
