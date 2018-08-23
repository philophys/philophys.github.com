---
title: Adres Dönüşümü, PAE, Sayfalama
---

Selamlar.

Bu yazıda hem teori hem de pratikte sanal adreslerin nasıl gerçek adrese dönüştüğünü gösterebilmeyi umuyorum. Öncelikle daha önceden yazdığım iki yazıyı ([1](/posts/hafiza-yonetimi-sayfalama-ve-segmentasyon-1.html), [2](/posts/hafiza-yonetimi-sayfalama-ve-segmentasyon-2.html)) okumanız sizler için faydalı olacaktır. Bende yeniden okudum ve bazı hatalarını da düzelttim.. Öğrendikçe de düzelteceğim umarım. Zaten açıkçası ordakiler günümüzün IA-32'sinin çok gerisinde. Talep olursa en son haliyle ilgili yazılar da yazabilirim. Neyse.. Şimdiii, öncelikle nerden çıktı bu yazı? Windbg üzerine `!pte` komutunu anlamaya çalışıyordum. Ona girince mecburen buralara kadar geldim. Açıkçası çok da bilinmesi icap eden bir mevzu değil. Fakat üzerinde yaşadığım sistemin temelini açıkçası merak ediyorum. Yani gördüğünüz tüm adreslerin aslında bir tutamak adres olması, aslında size gerçek fiziksel adresin gösterilmiyor olması, ilginç değil mi ? İşletim sistemi bize güvenmiyor.. eheh. Yazıda öncelikle bilgileri tazelemek için teorik bir özet geçeceğim, ardından pratik kısmına dalacağız inşallah.

## Segmentasyon Aşaması
Hatırlarsanız öncelikle segmentasyon denilen bir olay vardı adresleri elde edebilmek için. Örneği korumalı modda değilseniz segmentasyon size fiziksel adresi veriyordu, yok korumalı modda iseniz segmentasyon size lineer adresi veriyordu. Hızlıca özetlemek için bir diyagram çizdim. Bakınız: (örneğin önceki yazıdaki selektör çiziminde bir hata var, **RPL** alanı için 0-2 bitleri vermeliydim, 0-1 vermişim.)

![](/files/segmentasyonteorisi.png)

Özetlemek gerekirse, elimizde bir adet selektör, bir adet de offset değeri oluyordu hatırlarsanız.  Selektörün yüksek anlamlı 13 biti bize bir Index değeri, 3. biti ise **TI** değeri, yani selektörün hangi tabloya ait olduğu bilgisini veriyordu. Unutmadan not düşelim, **Index** değeri 13 bit olduğuna göre 2<sup>13</sup> yani en fazla 8192 değer alabilir. Dikkat ederseniz bu aynı zamanda **GDT** ve **LDT** tablosunun maksimum boyutuna tekabül etmektedir. Devam edersek, selektör sayesinde belirtelen tablonun, belirtilen sırasındaki segment tanımlayıcı alınıyor (yapısını önceki yazılarda bulabilirsiniz) ardından o tanımlayıcı içerisindeki base adress değeri ile baştaki offset değerimiz toplanarak sayfalama aktif olduğu için lineer adres elde ediliyor.

## Sayfalama Aşaması
Buradan sonra işin içine sayfalama girdiği için, 32 bit uzunluktaki lineer adresimiz 10-10-12 bit şeklinde ayrılıyor, ve bu ayrılmış bitlere göre birtakım yolculuklar ediyordu. Hatırlayalım:

![](/files/sayfalamateorisi.png)

Burada ne oluyordu? Öncelikle **CR3** yazmacının yüksek anlamlı 20 bitinden(12-31) Dizin Tablosu'nun başlangıç adresi alınıyor. Ardından lineer adresteki 22-31 arası bitlerine göre Dizin Tablosundan bir girdi(**PDE-Page Directory Entry**) seçilir, bu girdi bizi Sayfa Tablomuza götürecek. Ardından lineer adresteki 12-22 arası bitleri ile Sayfa Tablomuzdan bir sayfa girdisi (**PTE-Page Table Entry**) seçilir. Son olarak bu sayfa girdisinin gösterdiği sayfaya gidilir ve lineer adresteki offset'e göre bir yere gelinir. Burası da bizim gerçek adresimiz oluyor. (Sayfaların genellikle **4K** uzunluğunda olduğunu da hatırlatayım. Ama burada bahsettiğim sayfalama çok çok temel bir sayfalama. Şu an kullandığınız bilgisayardaki temel buradan geliyor, fakat %90 bundan farklı durumdadır.) Bunu bir örnek ile göstermek istiyorum.

Örneğin 16 tabanında `00D54B53` lineer adresi var elimizde. Bunu sayfalama işleminden nasıl geçiririz? (Tabi bilgisayarda bunu CPU yapıyor.) Şu şekilde, öncelikle adresimizi 2lik tabanda yazalım.

	0000000011 0101010100 101101010011
	    |          |            |
	Dizin:3    Tablo:340    Offset:2899

Bu binary->decimal dönüştürme işlemleri için örneğin Windbg üzerinde `.formats 0y101101010011` komutunu kullanabilirsiniz. 

	0:000> .formats 0y101101010011
	Evaluate expression:
	  Hex:     00000b53
	  Decimal: 2899
	  Binary:  00000000 00000000 00001011 01010011

Buradan sonra gerisi yukarıdaki diyagrama kalıyor. Ayrıca bir de not düşeyim. Bizim sayfa offset değerimiz 12 bit idi. Bu demektir ki 2<sup>12</sup>=4096, o da **4K** eder. Yani standart sayfalar **4K** bilgi tutabilir. Ayrıca tablo indexi de 10 bit olduğuna göre 2<sup>10</sup>=1024, yani **1K** tane sayfa elemanı tutabiliyor bu sayfa tabloları. Sonuç olarak 1K x 1K x 4K = 4GB. İşte bu nedenle 32 bit işletim sistemleriniz **4GB** belleği bellekleyebiliyor. (Burada PAE'yi yok sayıyoruz ama, ayrıca 1024 değer tutabiliyor olması 1024'ünün de dolu olacağı anlamına gelmiyor.) Harika değil mi?!

## PAE Nedir? Ne işe yarar?
**PAE**(Physical Address Extension) x86 makinelerin 4GB'dan fazla belleği adresleyebilmesini sağlayan bir sistemdir. Intel Pentium Pro ile birlikte tanıtılmıştır. Çalışabilmesi için hem işlemci hem de işletim sistemi tarafından desteklenmelidir. Ayrıca 32 bit sistemlerde PAE, DEP korumasını da mümkün kılmaktadır. 

**PAE** durumunu 4'e ayırabiliriz. Bunlardan iki **no-PAE** modunda **4KB** ve **4MB** sayfalar. Diğer ikisi de PAE modunda **4KB** sayfalar ve **2MB** sayfalar. Normal bir x86 mimarisinde sayfalama 2 aşamalı sayfa değişimi ile gerçekleşir. **CR3** bir dizin tablosuna işaret eder, burada, **PDE** içerisindeki **PTI**(Page Table Index) ile sayfa tablolarına işaret eder. Ardından burada **PTE** içerisindeki Sayfa Offset'i ile de sayfaya ulaşılır.

**PAE** açıldığında ise, sayfa tabloları ve dizin tabloları 64bit uzunluğuna yükselir, yani 8byte olur. Fakat bu tabloların uzunluğunu değiştirmez, yine 512 girdi olur, fakat girdiler büyüdüğü için adreslenebilecek alan da doğal olarak büyür. Ayrıca diğer önemli bir değişiklik, **CR3**, Dizin Tablosu yerine **Page Directory Pointer Table** denilen ve 4 adet **PDPTE**(Page-Directory-Pointer-Table Entry) girdisi tutan yapıyı kendinde saklamaya başlar. Bunu Intel'den bir alıntıyla görselleştirmemiz gerek. Aşağıda 4KB'lık sayfalarda **no-PAE** ve **PAE aktif** durumdaki sayfalama mekanizmasını görüyorsunuz.

**PAE Aktif, 4KB Sayfa**:

![](/files/pae-32bit-paget.png)

**no-PAE, 4KB Sayfa**:

![](/files/nopae-32bit-paget.png)

Bunların bir de sayfa boyutlarının büyümüş hali oluyor. Mesela **PAE** açıksa ve **PSE** biti set edilmişse sayfalar **4KB** boyutundan da büyük olabiliyor. Bu durumda sayfa tabloları kalkıyor ve dizin tabloları(sayfa dizini demek belki daha doğrudur) direk olarak bu 2MB'lık sayfalara işaret ediyor. Tabi bu sayfaların 2MB olduğunu anlamak için ayrıca **PDE** girdilerindeki **PS** bitinin de 1 olarak set edilmesi gerekiyor. (7. bit) **no-PAE** durumunda ise eğer **PDE** içerisindeki **PS** biti set edilmişse 4MB'lık sayfalar oluyor ve yine sayfa tabloları ortadan kalkıyor ve dizin tablosu direk olarak bu 4MB'lık sayfalara işaret ediyor. Biraz karışık gibi bir durum ama aslında çok basit. Sadece çok fazla terim olduğu için biraz karışıyor.. Hatta bir de **x86-64** üzerinde **PAE** açık iken, long-mode ile gelen değişiklikler de var.. **IA-32E** modu... 1GB'lık sayfalar.. Lineer adresin 5'e bölünmesi.. Bunlarla beraber **256TB** kadar bellek adreslenebiliyor! Ama onlara girmiyorum yoksa içinden çıkamayacağız.. (Fakat talep gelirse anlatabilirim yine de)

PAE'nin aktif olup olmadığını öğrenmek için **CR4** yazmacına bakmamız gerekiyor. Bu yazmaç korumalı moddaki bazı özellikleri yönetmek için kullanılmaktadır. Aşağıda *Windows XP SP3 32 bit* bir sistemin **CR4** yazmacının içeriğini görüyorsunuz.

	kd> .formats @cr4
	Evaluate expression:
	  Hex:     000006f9
	  Decimal: 1785
	  Binary:  00000000 00000000 00000110 11111001

**PAE** biti bizim sağdan başlayan 5. bitimiz. Dikkat ederseniz burada 5. bit **1**. Yani PAE aktif durumda. PAE aktif ise ayrıca 4. bit olan **PSE**(Page Size Extension) bitine de bakmamız gerek. O da 1, yani aktif. Bu da demektir ki sayfaların boyutu 4KB'dan büyük olabilir. (Eğer **PS** set edilmiş(1) ise) PSE bunu gösterir. Mesela PAE kapalı olur da, PSE ve PS set edilirse, o zaman sayfalar 4MB olurlar. Tabi bu durum lineer adresin ayrıştırılmasını da etkiliyor.. Mesela son durumda adres 2'ye ayrılır. Biri page directory'i gösterir, diğeri ise offset değerini.. Ayrıca eğer PAE aktif, PS=0 olursa lineer adres 3 değil 4 parçaya bölünüyor. Yahu ne PAE'imiş. Kolumuzu verdik, bacağımızı da aldı. Beni kurtarın. Neyse... Neden 4 parçaya bölünüyor peki?

Aslında oldukça basit! PAE aktif olunca hatırlarsanız Sayfa Dizin Gösterici Tablosu diye bir şey daha eklenmişti sayfalama mekanizmasına. İşte lineer adres bu yüzden 4'e ayrılıyor. Çünkü lineer adreste bir yerin bu tablodaki bir girdiyi vermesi lazım ki sayfalama işleyebilsin. Yoksa lineer adres kendi bilemez ki hangi girdiye ait olduğunu.. Son olarak bu kısımda yapıların topluca bi resmini vermek istiyorum. Aşağıda PDPTE, 2MB PDE, PDE ve 4KB PTE yapılarını görebilirsiniz.

![](/files/psepaeile.png)

## Adres Dönüşümü
Şimdi elimizde bir sanal adres var. Bu adresin dönüşümünün nasıl olduğunu görelim bakalım. Windows XP, PAE ve PSE set edilmiş bir sistemdeki adresin dönüşümü bakalım nasıl oluyormuş...

Seçtiğim adres : `0x8056f58c -> NtOpenFile`

Şimdi. İşler biraz karışabilir, umarım anlatabilirim. Bu adres bizim sanal adresimiz. Bu adres segmentasyon ile lineer adrese, ardından sayfalama ile fiziksel adrese çeviriliyor normalde. Fakat sayfalamanın da etkisiyle segmentasyon neredeyse kullanılmadığı için sanal adres aynı zamanda lineer adrese eşit oluyor. Bunu gösterebilmek için **GDT** tablosunda gezinmemiz gerekecek.. Bunun için `dg` komutunu kullanacağız. `dg` otomatik olarak **GDT** adresini **GDTR** yazmacından alıp, içeriğini bize verecek. Ayrıca **GDT** adresini almak için `r gdtr` yapabileceğinizi de ekleyeyim.

	kd> dg 0 30
	                                  P Si Gr Pr Lo
	Sel    Base     Limit     Type    l ze an es ng Flags
	---- -------- -------- ---------- - -- -- -- -- --------
	0000 00000000 00000000 <Reserved> 0 Nb By Np Nl 00000000
	0008 00000000 ffffffff Code RE Ac 0 Bg Pg P  Nl 00000c9b
	0010 00000000 ffffffff Data RW Ac 0 Bg Pg P  Nl 00000c93
	0018 00000000 ffffffff Code RE Ac 3 Bg Pg P  Nl 00000cfb
	0020 00000000 ffffffff Data RW Ac 3 Bg Pg P  Nl 00000cf3
	0028 80042000 000020ab TSS32 Busy 0 Nb By P  Nl 0000008b
	0030 ffdff000 00001fff Data RW Ac 0 Bg Pg P  Nl 00000c93

Bakınız burada ilk girdi, **null descriptor**. GDT'nin ilk elemanı o olmak zorduda. Ardından 2 tane Code ve 2 tane Data segment tanımlayıcısı geliyor. **PL** kısmına bakarsak ikisi **ring 0**, ikisi **ring 3**. Yani user-mode ve kernel-mode için kod ve data segmentleri tanımlanmış. Benim seçtiğim `0x8056f58c` adresi kernel mode kod segmentinde bulunuyor. Peki bunu nasıl anladım? Öncelikle bunun için kod segmentimizi öğrenip, oradaki selektörün gösterdiği betimleyiciyi buldum. Bakınız:

	kd> .formats @cs
	Evaluate expression:
	  Hex:     00000008
	  Decimal: 8
	  Binary:  00000000 00000000 00000000 00001000

Bakınız burada binary kısmın düşük seviyeli 16 bit'i bizim selektörümüz. `00000000 00001 0 00` Düşük seviyeli 2 bit **RPL**, 3. bit **TI** değeri idi. 3. bit 0 olduğuna göre selektör GDT'yi gösteriyor. Index'e bakarsak 1 var. Demek ki GDT'nin 1. sırasındaki girdi bizim aradığımız girdi. (Bakın ayrıca direk selektör numarasına göre de bulabilirsiniz, örneğin selektör numarası 8, bu nedenle GDT'de 8 selektörüne sahip olana bakıyoruz. Ayrıca seçtiğim adresin direk kernel-mode bir fonksiyon olduğu için, kafadan kernel mode kod segmentinde olduğunu anlayabilirsiniz.)

	kd> dg 0 8
	                                  P Si Gr Pr Lo
	Sel    Base     Limit     Type    l ze an es ng Flags
	---- -------- -------- ---------- - -- -- -- -- --------
	0000 00000000 00000000 <Reserved> 0 Nb By Np Nl 00000000
	0008 00000000 ffffffff Code RE Ac 0 Bg Pg P  Nl 00000c9b

Bakınız burada bu segmentin base adresi `00000000`, limiti `ffffffff`. Ama yukarıya bakarsanız diğerleri de öyle? Bu da ne demek? İşte bu sayfalama ve sanal adresleme sayesinde oluyor. Eğer segmentasyon olsaydı base adresleri falan birbirinden farklı olmalıydı. Oysa bu betimleyicilerin hepsi tüm lineer adres alanını kaplıyor. Bu aynı zamanda sistemi hızlandıran bir olaydır, lakin bu sayede kodlar çalışırken segmentler arası geçiş olmuyor. Çünkü segmentler aynı alanı paylaşıyorlar sanal adresleme sayesinde. Örneğin bu özellik olmasaydı, başka segmentteki her fonksiyon çağrısında o segmentteki kodları çalıştırmadan önce yetki kontrolleri yapılacaktı, bu da sistem için zaman kaybı demekti.

Son olarak eğer segmentasyon olsaydı bizim sanal adresimiz olan `0x8056f58c`'e kernel mode kod segmentinin base adresini de ekleyecektik. Aslında şu anda da ekliyoruz: `0x8056f58c + 00000000 = 0x8056f58c`. Fakat etki etmediği için segmentasyon yokmuş gibi lineer adres aynı zamanda sanal adrese eşit oluyor. Umarım anlatabilmişimdir. Devam edelim..

Öncelikle hatırlarsanız sistemimizde **PAE** ve **PSE** bitleri set edilmişti. Yani işletim sistemimiz 4KB'dan büyük sayfalar kullanıyor olabilir.Sayfanın büyük olup olmadığını anlamak için PDE'deki **PS** bitini kontrol etmemiz gerekiyor. Sistemimizde **PAE** ve **PSE** set edilmiş idi. Eğer PDE'de de PS set edilmiş ise sayfalarımız 2MB boyutunda olacak. Yani dönüşüm şu şekilde olacak:

![](/files/pae-large-paget.png)

Şimdi bu demektir ki bizim lineer adresi yine 3'e böleceğiz. Fakat bu defa **2-9-21** şeklinde. Bunu yapmadan önce Sayfa Dizin Gösterici Tablosunun adresini **CR3** yazmacından alalım. Burada dikkatinizi çekmek isterim. CR3'den alacağımız adres fiziksel adrestir! **Ve bildiğim kadarıyla tek fiziksel adres tutan yazmaç da budur!** Bu değeri ayrıca process'in *DirBase* adresine bakarak da bulabilirsiniz. Bakınız:

	kd> r @cr3
		cr3=0034c000

	kd> !process
	PROCESS 865c6660  SessionId: none  Cid: 0004    Peb: 00000000  ParentCid: 0000
	    DirBase: 0034c000  ObjectTable: e1001bc8  HandleCount: 144.
	    ...
	    ...
	    ...

O zaman bu adresi dump edersek, dizin tablolarını(sayfa dizini) gösteren **PDPT** yapısını veyahut eğer **PAE** yoksa Dizin Tablosu ve onun girdilerini(PDE) görebilmemiz lazım değil mi? Deneyelim.

	kd> dd 0034c000
	0034c000  ???????? ???????? ???????? ????????
	0034c010  ???????? ???????? ???????? ????????
	0034c020  ???????? ???????? ???????? ????????

Göremedik. Peki neden? Çünkü `d*` varyantı komutlar fiziksel adresten okuma yapamaz! Fiziksel adres okumanız için bu komutların başına `!` koymalıyız. Deneyelim:

	kd> !dd 0034c000
	# 34c000 0034d001 00000000 0034e001 00000000
	# 34c010 0034f001 00000000 00350001 00000000

Gotcha! İşte karşınızda **PDPT** yapısı ve girdileri(PDPTE). İşte bu gördükleriniz bizim Dizin tablolarımıza(PDE) işaret edecek. Bu PDE yapılarından sanırım genellikle 4 tane oluyor.. Tam emin değilim fakat 4den fazlasına rastlamadım. PAE aktif olduğu için her bir girdi 64bit. Biraz düzenlersek aslında tablomuz şu şekilde karşımıza çıkacak.

	0034d001
	0034e001
	0034f001
	00350001
	...
	...

Burdan sonra zaten bu dizin tablolarındaki index bizim 2MB'lık sayfalarımızı gösterecek. Bu nedenle şimdi sanal adresi ayrıştırıp fiziksel adrese doğru gidelim.

	kd> .formats 0x8056f58c
	Evaluate expression:
	  Binary:  10000000 01010110 11110101 10001100


Bunu **PAE** ve **2MB** sayfa kullanıldığına göre **3** parçaya bölersek bölersek:

	10                     ->PDPT Offset değeri (2)
	000000010              ->PDT Offset değeri  (2)
	101101111010110001100  ->Large page offset değeri (0016f58c)

Tamam, öncelikle **PDPT** adresimizi alalım. Bunun için **CR3** yazmacını ve **PDPT offset**'ini kullanacağız.

	kd> !dd @cr3 + 0y10*8 l1
		#34c010 0034f001

Unutmayın, **PDPTE** girdileri 8 byte idi. Bu nedenle offseti'i 8le çarptık. Aradığımız değer `0034f001` imiş. Şimdi PDT offset değeri yardımıyla PDE'yi bulalım.

	kd> !dd 0034f001 + 0y10*8 l1
		#34f010 004001e3

`004001e3` imiş. Şimdi gelin bu **PDE** girdisini bitsel olarak inceleyelim.

	kd> .formats 004001e3
	Evaluate expression:
	  Binary:  00000000 01000000 00000001 11100011

Yukarıdaki resimden **PDE** yapısına bakarsanız, burada düşük öncelikli (yani sağdan) 7. bitin 1 olduğunu görürsünüz. İşte bu bit bizim **PS** bitimizdir. 1 olması durumunda **PAE** aktif ise sayfalar 2MB olur. Diğer bitlerin koruma mekanizması, istatistik gibi konularla ilgisi var. Fakat bunları burada anlatmayacağım. Ayrıca normalde PDE'den sonra bir de PTE'ye ulaşmamız gerekirdi, fakat sayfalar 2MB olduğu için direk olarak PDE'den sayfamıza ulaşıyoruz. PDE'den sayfa adresini almak için düşük öncelikli 21 biti yok sayıyoruz. Yani sağdan 21'biti boşverip, geri kalan kısmı alıyoruz. Bu bizim sayfa offsetimiz olacak. Ardından lineer adresimizin son 21 bitini de bu değere ekleyip fiziksel adresi bulacağız. Bunun için **PDE** ve **lineer adres**imizin gereksiz bitlerini sıfırlayıp etkisiz hale getiriyoruz. Yani:

	kd> !dd (004001e3 & 0y11111111111000000000000000000000) + (8056f58c & 0y00000000000111111111111111111111)
	#  56f58c 8b55ff8b 50c033ec 50505050 6a1c75ff
	#  56f59c 1875ff01 75ff5050 1075ff14 ff0c75ff

Bam! `56f58c`e denk geldi. Yani fiziksel adresimiz işte burası. Burada ilk parantez içinde düşük seviyeli 21 biti mantıksal işlem ile sıfırlıyoruz. İkinci parantezde ise baştaki 11 biti sıfırlıyoruz. İsterseniz doğrulamak için `db` ile bakabiliriz.

	kd> !db 56f58c
	#  56f58c 8b ff 55 8b ec 33 c0 50-50 50 50 50 ff 75 1c 6a ..U..3.PPPPP.u.j
	#  56f59c 01 ff 75 18 50 50 ff 75-14 ff 75 10 ff 75 0c ff ..u.PP.u..u..u..
	#  56f5ac 75 08 e8 4b c7 ff ff 5d-c2 18 00 cc cc cc cc cc u..K...]........
	kd> db 0x8056f58c
	8056f58c  8b ff 55 8b ec 33 c0 50-50 50 50 50 ff 75 1c 6a  ..U..3.PPPPP.u.j
	8056f59c  01 ff 75 18 50 50 ff 75-14 ff 75 10 ff 75 0c ff  ..u.PP.u..u..u..
	8056f5ac  75 08 e8 4b c7 ff ff 5d-c2 18 00 cc cc cc cc cc  u..K...]........

Gördüğünüz gibi içerikler aynı. Son olarak bu işin otomatikleştirilmesini göstereyim ve bitireyim.

## Fiziksel Adresin Otomatik Dönüştürülmesi
Bunca kafa karıştırdıktan sonra şimdi gelip tüm bu işlemleri tek komutla yapabileceğimizi söylemeye biraz çekiniyorum açıkçası fakat evet, yapabiliyoruz. Windbg'de `!pte` ve `!vtop` komutları bize çok yardımcı olacak. Bakınız:

	kd> !vtop 0 0x8056f58c
		X86VtoP: Virt 8056f58c, pagedir 34c000
		X86VtoP: PAE PDPE 34c010 - 000000000034f001
		X86VtoP: PAE PDE 34f010 - 00000000004001e3
		X86VtoP: PAE Large page mapped phys 56f58c
		Virtual address 8056f58c translates to physical address **56f58c**.

PDPE, PAE, Sayfa... Hepsini bize verdi gördüğünüz gibi. En sonunda da fiziksel adresi gösteriyor. Komuttaki 0 şu anki process contextinde işlem yapacağımızı gösteriyor. `!pte` ise yine benzer sonuçlar veriyor, fakat fiziksel adresi elde etmek için sayfa offset değerini tekrardan işleme sokmanız gerekiyor.

	kd> !pte 0x8056f58c
		PDE at C0602010            PTE at C0402B78
		contains 00000000004001E3  contains 0000000000000000
		pfn 400       -GLDA--KWEV   LARGE PAGE pfn 56f      

Buradaki pfn değeri bizim sayfa offsetimiz oluyor. -GLDA--KWEV kısmı PDE girdisindeki bitlere ilişkin bilgi veriyor. Fakat sanıyorum bunları bilmenize pek gerek yok. Bu PDE değerinin bitlerini daha net görebilmek için şöyle bir şey yapabilirsiniz mesela:

	kd> dt _MMPTE_HARDWARE C0602010
	nt!_MMPTE_HARDWARE
	   +0x000 Valid            : 0y1
	   +0x000 Write            : 0y1
	   +0x000 Owner            : 0y0
	   +0x000 WriteThrough     : 0y0
	   +0x000 CacheDisable     : 0y0
	   +0x000 Accessed         : 0y1
	   +0x000 Dirty            : 0y1
	   +0x000 LargePage        : 0y1
	   +0x000 Global           : 0y1
	   +0x000 CopyOnWrite      : 0y0
	   +0x000 Prototype        : 0y0
	   +0x000 reserved0        : 0y0
	   +0x000 PageFrameNumber  : 0y00000000000000010000000000 (0x400)
	   +0x000 reserved1        : 0y00000000000000000000000000 (0)

Bakın, örneğin *LargePage* biti set edilmiş. Bu yüzden 2MB'lık sayfalar kullanıyoruz gibi... Takıldığınız yer olursa yorumlarda belirtmenizi umuyorum.

Sevgiler.

---
* [PAE Wiki](http://en.wikipedia.org/wiki/Physical_Address_Extension)
* [PSE Wiki](http://en.wikipedia.org/wiki/Page_Size_Extension)
* [CR4 Register Wiki](http://en.wikipedia.org/wiki/Control_register#CR4)
* [MSDN PTE](http://blogs.msdn.com/b/ntdebugging/archive/2010/02/05/understanding-pte-part-1-let-s-get-physical.aspx)
* [Accessing Memory by Physical Address](https://msdn.microsoft.com/en-us/library/windows/hardware/ff537798(v=vs.85).aspx)
* Intel 64 and IA-32 Architectures Software Developer’s Manual Volume 3A
