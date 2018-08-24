---
layout: post
title: Hafıza yönetimi, Sayfalama ve Segmentasyon 2
categories: Bilgisayar
---

Tekrardan merhabalar, serinin 2. yazısının 2. bölümüne hoşgeldiniz :) Giriş biraz değişik mi oldu ne ? Şimdiki yazıda kaldığımız yerden yani sayfalama mekanizmasından devam ediyoruz. Fakat öncelikle ben yine bir müzik tavsiye edeyim sizlere, [buyurun.](http://www.youtube.com/watch?v=cTjF2_-bneM) En son sayfa dizini ve sayfa tablolarından bahsetmiştik. Sayfa tablolarına, sayfa dizinleri sayesinden erişebildiğimizi söylemiştim sanırım. Peki sayfa dizinlerine nasıl erişebiliyoruz ? Serinin [ilk yazısını](/posts/korumali-mod-ve-i386-mimarisi/) okuduysanız en sona doğru sizlere bir **CR3** isimli yazmaçtan bahsetmiş, görevi hakkında kısa bir bilgi vermiştim. Evet sayfa dizinlerinin fiziksel adresini **CR3** yazmaçı tutar. 

Şimdi sayfalama mekanizması ile fiziksel adresin nasıl elde edildiğini kısaca özetlersek, selektör ve offset değeri ile belleğin bir bölümüne erişilmeye çalışılıyor, selektör değeri ile GDT'deki bir tanımlayıcıya ulaşılıyor, ardından tanımlayıcının gösterdiği segmentin taban adresi alınıp ilk baştaki offset değerimiz buna ekleniyor, buraya kadarı önceki yazıda anlatmıştık, şimdi sayfalama devrede olduğu için gereken yeni işlemler şöyle olacak. Önceklikle **CR3** yazmaçından *sayfa dizininin* **fiziksel** adresi alınır. Lineer adresin ilk **10** bitindeki değere göre sayfa dizininden bir index değeri seçilir. Seçilen index değerine göre gösterilen adres ile sayfa tablosuna ulaşılır. Burdan da bir tanımlayıcı seçilmeli, ee bunun için de **lineer** adresin ikinci **10** bitindeki değere bakılır ve o değere göre sayfa tablosundan bir girdi seçilir. Sayfa tablosundan aldığımız değer bize **sayfanın** fiziksel adresini verecektir, ardından bu adrese lineer adreste kalan **12** bit offset olarak bu adrese eklenir. Burda son 12 bit dememizin nedeni ilk başta 10 biti ile sayfa dizininden, sonraki **10** biti ile de sayfa tablosundan bir girdi seçiyoruz. (*32 **-** 10 **x** 2 **=** 12*) Vee sonunda mutlu son, artık fiziksel adrese erişmiş olduk. Burada baya uzun bir bilgi verdim, meraklanmayın bunun da resimli gösterimini de vereyim hemen muhteşem ötesi çizimimle :D

![](/files/belleksayfalama.png)

Şimdi sıra geldi asıl kafa karıştıran ve karmaşık olarak bilinen kısımlara, 2 makaledir sürekli **GDT**'de sayfa tablosunda *girdiler* var diyorum. Peki bu girdiler nasıl girdiler ? Öyle *0,1,2,3* gibi mi ? **Tabiki hayır !** Şimdi onların yapısını görmeye hazırlanın. 

## Sayfa Dizini ve Sayfa Tablosu Tanımlayıcıları (Descriptor)
Bahsedeceğimiz her iki tabloda en fazla **1024** değer alabilir, bu değerler *4 bayt* değerindedir. (32 bit) Yani anlayabileceğiniz üzere bir sayfa tablosu veya dizini toplamda **4kb** boyutundadır. Sayfaların da **4kb** olduğunu hatırlatayım :) Şimdi ben yine klasik bir biçimde Sayfa dizin ve tablolarını bir resim ile gösterip açıklamaya başlayacağım. Her ne kadar sizin için fark etmesede muhtemelen benim bu tabloları çizmem **en az 1** saatimi alacak :)

![](/files/dizintablogirdisi.png)

Evet nasıl olmuş çizimim ? Şimdi açıklama kısmına gelmeden önce şunu hemen belirteyim eğer ki sayfalarınızı **4KB** değil de **4MB**'lık yaparsanız *21 - 12* bitleri ayrılmış durumda olacak. Ama sanıyorum ki **4MB**'lık sayfa kullanan işletim sistemi hem az var, hemde pek yazılmaz. Kim bilir belki ben [**inste**](/inste/blob/master/READMETR.md)'yi **4MB**'lık sayfalar üzerine kurarım... Neyse şimdi açıklama işlemine başlayalım daha çok işimiz var. Şimdi başta dikkatinizi çekmiştir iki girdi neredeyse aynı gibi. Burada adreslerin **20 bit** olarak tutulur çünkü girdide tablo veya sayfanın kaçıncı **4kb**'da olduğunu belirtilir, **adresi değil**. Sonraki **3 bit**lik ayrılmış kısımlar programcılara bırakılmıştır. Dilediğiniz şekilde oraya veri yerleştirebilir, kendi fikirleriniz için kullanabilirsiniz. İncelemeye devam edelim..

**P Biti**: Bu bit ile sayfa tablosunun veya sayfanın bellekte olup olmadığı bildirilir, **0** ise değil, **1** ise bellektedir.

**R/W Biti**: Sayfa tablosu veya sayfanın okunup yazılabilme durumunu gösterir.

**U/S Biti**: S.T veya sayfaya programcıların erişimini belirler.

Bu iki bit biraz farklı bitler, farklı kombinasyonlara göre farklı anlamlar meydana getiriyorlar. Şöyle ki;

    | U/S  |  R/W  |  Uyg. Programcısı  | S. Programcısı |
	   0       0         Erişemez          Okur / Yazar
	   0       1         Erişemez          Okur / Yazar
	   1       0         Okuyabilir        Okur / Yazar
	   1       1         Okur / Yazar      Okur / Yazar

Bu defa resim yerine kendimce bir tablo çizmeye çalıştım buradan, fakat bu daha zor oldu üstelik şuan bir markdown dönüştürücü olmadan yazıyorum, düzgün çalışacakmı onuda bilmiyorum :D Neyse dağıtmadan devam edelim.

**PWT Biti**: *Cache mekanizması* ile ilgilenen bit. **0** ise tampondan okuma / yazma yapılabilir.

**PCD Biti**: **CPU**'nun **L1**,**L2** önbelleklerinin sayfalar için kullanılma durumunu belirler. **0** ise kullanılabilir.

**A Biti**: İstatistiksel veri için kullanılır, sayfaya veya dizine her erişildiğinde değeri değiştirilir.

**D Biti**: Buda istatistiksel veri için kullanılır. Belirtilen sayfaya her **yazma** işleminde değeri değişir. Bu bit sayfa dizini tanımlayıcılarında yoktur ayrılmıştır.

**PS Biti**: Sayfa boyutu ile ilgilidir. Eğer **1** ise **4 MB**, **0** ise **4 KB**'lık sayfalar kullanılır. Sayfa tablosu tanımlayıcılarında ayrılmıştır, kullanılmaz.

**G Biti**: Sayfanın global olmasını sağlar, sayfa dizini için bir şey ifade etmez.

Evet böylece sayfa dizini ve sayfa tablosu tanımlayıcılarını bitirmiş olduk :) Şimdi sıra geldi **GDT** ve **LDT** tanımlayıcılarına.

## GDT ve LDT Tanımlayıcıları (Descriptor)
Bu tanımlayıcılar sayfa dizini ve tablosu gibi **32** değil **64** bittir. (8 Bayt) Bu tanımlayıcılara halk arasında(:D) segment tanımlayıcısı denir. Neden ? Çünkü hatırlarsanız **GDT**'deki girdiler bir segment ile ilgili bilgiler içeriyordu. Şimdi anlatıma geçmeden önce bu tanımlıyıcılarında sembolik çizimini göstereyim sizlere.

![](/files/segmenttanimla.png)

Buda çizimi zor tablolardan biriydii. Şimdi bu tanımlayıcıyı açıklayalım. Önceki gibi sağdan başlıyorum.

**Limit 0-15**: 20 bitlik limit bölümünün segment'in taban adresinden itibaren 16 bitini tutan bölüm.

**Taban 0-15**: Segment taban adresinin 16 biti.

**Taban 16-23**: Segment taban adresinin 16-23 arasında kalan 8 biti.

**Tip**: Segmentin tipi. Belirtilen segmentin kod, veri segmenti olup olmadığını bildirir.

**S Biti**: Segment sistem segmentiyse* 0, hafıza segmentiyse(kod,veri,stack) 1 değerini alır.

**DPL Biti**: Ayrıcalık düzeyini belirtir.

**P Biti**: Segmentin hafızada olup olmama durumunu belirtir. Segment hafızada ise **1**, hafızada değilse **0** değerini alır.

**Limit 16-19**: 20 bitlik segment limiti bölümünün geriye kalan 4 biti.

**AVL Biti**: Kullanılması zorunlu değildir, istatistiksel amaç için kulllanılabilir.

**0 Biti**: Ayrılmış bir bittir, daima **0** değerini alır.

**D/B Biti:** *D/B* biti eğer **1** ise segment **32** bit, eğer **0** ise segment **16** bitdir.

**G Biti**: Limitin bayt mı yoksa sayfa mı olduğunu belirtir. *Bayt* olursa **1 MB**, *sayfa* ise **4 GB** limit verilebilir.

**Taban 24-31**: Segment taban adresinin geriye kalan 8 biti. (16 **+** 8 **+** 8 **=** 32 *Bit*)

Evet, genel hatları gördük. Şimdi bir ince ayrıntı var oraya değinelim. Tabloda gördüğünüz üzere **Tip** bölümü *4 bitlik* değer taşıyor. Bu bitlerin her biri farklı bir anlam içeriyor bizim için. Ayrıca bu anlam segment'in sistem veya hafıza segmenti olması göre farklılık gösteriyor. Sistem veya hafıza segmenti olup olmadığınıda **S** bitinden anlıyoruz.

Örneğin **S** biti **1** yani **hafıza segmentiyse**. Bitlerin aldığı değer ve anlamları görelim.

**1. Bit**: Eğer **0** ise segment *veri* ya da *yığın* segmentidir. **1** ise *kod* segmentidir. Veri ve kod için *T* ile isimlendirilir. (Type)

**2. Bit**: Segment *kod* segmenti değilse, segmentin veri segmenti mi yoksa yığın segmentimi olduğu bu bitten anlaşılır. Eğer **1** ise yığın segmenti, **0** ise veri segmentidir. Veri için *E*, kod için *C* ile isimlendirilir.

**3. Bit**: Bu bu segmenti kod segmenti olma durumuna göre değişir. Şöyle ki segment veri ya da yığın segmentiyle bu bit ile yazma kontrolu yapılır. Eğer bit **1** ise **hem yazılır hem okunur**, **0** ise **sadece okunur**.

Eğer kod segmentiyse okuma kontrolu için kullanılır. Eğer **1** ise segment hem okunur hem çalıştırılır, **0** ise sadece çalıştırılabilinir. Veri için *W*, kod için *R* ile isimlendirilir. (Writable - Readable)

**4. Bit**: Yine istatistiksel amaç için kullanılan bir bittir. Segmente her erişildiğinde **1** yapılır. Her ikisi için de *A* ile isimlendirilir. (Accessed)

Sonuçta bu 4 bit, bazı kombinasyonlar ile farklı anlamlar oluşturuyor. Bunları topluca görelim şimdi.

			  Tanımlayıcı
	T E W A       Tipi    Kazanılan Anlam
	0 0 0 0   0   Veri    Sadece Okuma
	0 0 0 1   1   Veri    "", erişildi
	0 0 1 0   2   Veri    Okuma/Yazma
	0 0 1 1   3   Veri    "", erişildi
	0 1 0 0   4   Veri    Sadece okuma
	0 1 0 1   5   Veri    "", erişildi
	0 1 1 0   6   Veri    Okuma/Yazma
	0 1 1 1   7   Veri    "", erişildi
	 
	T C R A 
	1 0 0 0   8   Kod    Sadece Çalıştırılabilir
	1 0 0 1   9   Kod    "", erişildi
	1 0 1 0   A   Kod    Çalıştırılabilir/Okunabilir
	1 0 1 1   B   Kod    "", erişildi
	1 1 0 0   C   Kod    Sadece Çalıştırılabilir
	1 1 0 1   D   Kod    "", erişildi
    1 1 1 0   E   Kod    Çalıştırılabilir/Sadece Okunabilir
    1 1 1 1   F   Kod    "", erişildi

Tabloyu önizledim de, ne kadar güzel görünüyor sayfa içerisinde... Devam edelim, zaten tek bir küçük ayrıntı kaldı benim anlatacağım, oda selektörlerin yapısı.

## Selektörler ( Selector )
Önceki yazıdan hatırlarsanız, selektörlerin *16* bit olduğunu söylemiştik. Selektörlerin yapısı şu şekildedir.
	
![](/files/selektoryapi.png)

İlk iki bit yani *RPL*(Requested Privilege Level) değeri, koruma mekanizması ile alakalıdır, kısaca **RPL** değeri ulaşılmaya çalışan segmentin **DPL**(Descriptor Privilege Level) değerinden büyükse koruma modu bu erişime izin vermez. **3**. bit ise selektörün hangi tablo için kullanıldığını gösterir. Eğer bu bit **0** ise *GDT*, **1** ise *LDT*'den değer gösteriyor demektir. Geri kalan 13 bit'de selektörün index bitleridir. 

Şöyle bi kontrol ediyorum yazıyı... Evet, sanırım bitirdim anlatacaklarımı ama bende bittim, 2 gün sürdü yazmam tabi evdeki bilgisayarı kaldırınca biraz zor oluyor. Okuyanlara teşekkür ederim.

----
* Yararlı kaynaklar [önceki Yazıda](/posts/hafiza-yonetimi-sayfalama-ve-segmentasyon-1/)
