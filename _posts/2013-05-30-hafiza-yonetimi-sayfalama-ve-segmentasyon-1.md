---
layout: post
title: Hafıza yönetimi, Sayfalama ve Segmentasyon 1
---

Serinin *2*. yazısından merhabalar, biraz gecikti bu yazı sınav dolayısıyla zaten kaç kişi yazıları takip ediyor orasıda ayrı o başka bir konu...  Bugün korumalı modun biraz daha derinine ineceğiz ve daha çok *teorik* kısmına bakacağız. Uzun soluklu bir yazı olacağı için sizi [şu müzik](https://www.youtube.com/watch?v=6sHvUv_w18I) eşliğinde okumaya davet ediyorum. Öncelikle korumalı modun hafızayı nasıl yönettiği konularına bir bakalım. Korumalı modda hafıza yönetiminin gerçekleşmesi sayfalama mekanızmasının aktif olup olmamasına göre farklılık gösterir. Eğer sayfalama **aktif edilmişse** *segmentasyon ve sayfalama* kullanılarak, **aktif değilse** yalnızca *segmentasyon* kullanılarak hafıza yönetimi gerçekleştirilir. Segmentasyon sayesinde tüm prosessler birbirlerinden ayrı ayrı gerçekleştirilir. Tüm işlemler kendi segmentlerinde çalışır fakat yinede segment dışına çıkma olayları görülmektedir. Sayfalama sayesinde işlemlere sanal bellek tahsis edilir. Çalışan prosess'e ait sayfa dizini ve sayfa tabloları ile lineer adresler fiziksel adreslere dönüştürülür. 

Sayfalama mekanizması aktif olarak gelmez, **manuel** olarak aktif edilmesi gerekir. 

Önceki yazıdadan hatırlayacağınız **GDT** tablosu hafıza yönetiminde kilit noktalardan biridir. GDT *basit* olarak içerisinde tanımlamalar bulunan bir dizidir. **GDTR** yazmacı ise GDT'nin bellek adresini tutar. En fazla *8192* tanımlayıcı tutabilir, tanımlayıcıların içeriğini ilerde daha ayrıntılı olarak göstericem, kısaca bellekte bulunan segmentlerle ilgili bilgileri tutuyorlar diyebiliriz, yani bellekteki bir segmente erişebilmek için örneğin adresi *XXX* olan bir segment *GDT*'de **53**. tanımlayıcıya denk geliyorsa, segmente erişilmeden önce *GDT*'nin **53**. tanımlayıcısına erişilip segment hakkındaki kritik bilgiler alınır. (Limit değeri, Ayrıcalık düzeyi, Taban adresi..)

## Segmentasyon Mekanizması
Segmentasyon mekanizması[^2] adres elde edilmesi için kullanılan mekanizmadan biridir, korumalı modda yazmaçlar **selektör** adı verilen bir değer tutar. Bu değer global tanımlayıcı tablosundan bir değer seçmeye yarar. Korumalı modda bellek adresleri iki bölümden oluşur. Bunlar *16 bit selektör* ve *32 bit* offset değeridir. Gerçek adres elde edilirken önce selektör değeri yardımıyla *GDT*'den gereken *taban adresi* alınır. Daha sonra bu taban adresine offset değeri eklenerek adres elde edilmiş olur. Hatırlarsanız *Reel* modda da buna biraz benzeyen bir mekanizma vardı. Fakat iş burada bitmiyor. Başta dediğim gibi eğer sayfalama kapalıysa bu adres gerçek adresimiz oluyor, fakat sayfalama açık ise bu *lineer* adres oluyor, gerçek adresi bulabilmek için *sayfa tablosu* ve *sayfa dizini*ne başvurmamız gerekecek.. Bu kısımda gördüğümüzü diyagramlaştırmak gerekirse.

![](/files/gdtdenadres.png)

Tablo ayıracları biraz iri yarı oldu ama idare edeceğiz artık :D Görsel hafızası güçlü olan okuyucular için daha akılda kalıcı olacaktır.  Artık *reel* moddan farkını anladınız sanırım, reel modda segment direkt olarak taban adresiydi, burada ise segmentin tuttuğu değer *GDT* tablosundaki bir **tanımlayıcıyı** gösteriyor. Evet şimdi sıra geldi Sayfalama mekanizmasına..

## Sayfalama Mekanizması (Paging)
Sayfalama mekanizması[^3] segmentasyona göre biraz daha karışık gibi görünsede *teorik* kısmı aslında gerçekten basit. İlk bakışta bende korkmuştum biraz açıkcası. Sayfalama işlemlere sanal bellek vermemizi sağlıyor kısaca. Fakat burda önemli bir sorun da var. İsmine **parçalanma(fragmentation)** sorunu denen bir şey. Yazı ile anlatmak biraz zor olacak bundan dolayı bu kısmı yazarken bir diyagram hazırlamaya başladım bile. 

Basitçe bir anlatayım, örneğin elinizde *53 kb* bellek kullanan bir program var, yani bellekte *53 kb*'lık bir yer tahsis edilmiş, bir süre sonra bu programı kapatalım yani kullandığı *53 kb*'lık alan boşaldı, işte bu boşluğu **54 kb** bellek ihtiyacı olan bir program kullanamaz. Bu şekilde bu boşluklar artarak belleğin çoğunu dolu olmadığı halde dolu gibi gösterir. Bizim sayfalama mekanizmamız da bu sorunu önler.

![](/files/fragmentation.png)

Sanırım biraz daha iyi anlaşıldı, ben yine beğenmedim çizimimi o ayrı bir konu. Ayrıca daha detaylı bir anlatımı *Kaan Hoca*nın blogunda bulabilirsiniz.[^1] Bu tür bir parçalanma konusu dosya sistemlerinde de mevcut, olurda o konuda da yazarsam onuda anlatmak nasip olur inşallah. Şimdi sayfalama mekanızması bu sorunu nasıl çözer ? Şöyle, sayfalama mekanizması ile bellek **4kb**'lık (genellikle) parçalara ayırılır. Ardından *çalışacak program da belleğe gelmeden parçalara ayrılır* ve belleğe yüklenir. Ardından bu program kapatıldığında bellekte yine **4 kb**'lık sayfa boşlukları olacaktır, fakat belleğe yeni girecek programlarda **4kb** parçalara ayrılarak geleceği için herhangi bir parçalanma sorunu ortaya çıkmayacaktır. Peki bu sayfaların sırası nasıl tutuluyor dersiniz ? Evet, işte burdada bahsettiğim *sayfa tablosu* devreye giriyor. Yeri gelmişken belirteyim dosya sistemlerinde de bu amaç için kullanılar tablolar vardır, örneğin **FAT** dosya sisteminde *FAT Table* denilen tablolar mevcuttur. Fakat unutmayın ki bu tabloların yapıları aynı değildir. Sayfalamayı aktif edebilmek için önceki yazıda da bahsettiğim **CR0** yazmacının *31. biti* **1** yapılmalıdır.

Sıra geldi gerçek adresi *sayfalama* ile elde etmeye. Önce dediğimiz gibi segmentasyon mekanizması ile lineer adres elde edilir. Ardından *sayfa tablosu* ve *sayfa dizini* kullanılarak gerçek adres elde edilir. Şimdi bunlardan bahsedeyim biraz.

**Sayfa Dizini** : Bu dizin *sayfa tablolarının* bellekteki fiziksel adreslerini tutar, yapı olarak sayfa tablosuna benzerler tek **önemli** fark bu *dizinler* **sayfa tablolarının**, *sayfa tabloları* ise **bellek sayfalarının** adresini tutar. En fazla 1024 girdiye sahiptir. Adresleri CR3 tarafından tutulur.

**Sayfa Tablosu** : Bellekteki sayfaların adreslerini tutar. En fazla 1024 girdiye sahip olabilirler.

Her işlemin **bir** sayfa dizini vardır, fakat bir süreç **birdan fazla** sayfa tablosuna sahip olabilir. Sayfa tabloları 1024 girdiye sahip olduğu için **1024x4=4096 KB** yani 4MB bellek adreslenebilir. Kısaca diyelim sizin Chrome browserınız **20 MB** hafıza kullanıyorsa ki bundan fazla kullanıyor. *1* Sayfa dizini, *5* Tane de sayfa tablosuna sahip olur. Hatırlarsanız sayfa dizinleride 1024 girdiye sahip olabiliyordu, işte kilit nokta burda, bizim 32 Bitlik işletim sistemleri kaç GB belleği görüyordu ? 4 dimi ?. Eee o zaman bir sürecin 1024 sayfa tablosu olabilir, o halde **1024x1024x4 KB= 4 GB** göreceğiniz üzere sayfa tablosu ve sayfa dizini kullanılarak 32 bit sistemlerde kullanılabilecek tüm bellek adreslenebiliyor. Son olarak buradaki bazı olayları *Kaan Hoca*'dan da dinleyebilirsiniz.[^4] Devamını artık ne zaman yazarım bilemiyorum, bugün derslerden ilk defa fırsat bulabildim, sonuna kadar okuyanlara teşekkürler.

----
* Bellek Yönetiminde Bölünme Kavramı [Kaan Aslan](http://www.kaanaslan.com/resource/article/display_article.php?page=2&id=69)
* Segmentation [OSDev](http://wiki.osdev.org/Segmentation)
* Paging [OSDev](http://wiki.osdev.org/Paging)
* SSS-2  [Kaan Aslan](http://www.youtube.com/watch?v=blit3fl4cZA)
* [Kutalmis](http://kutalmis.wordpress.com)
