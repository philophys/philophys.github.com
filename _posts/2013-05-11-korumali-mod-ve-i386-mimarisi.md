---
layout: post
title: Korumalı Mod ve i386 Mimarisi
categories: Bilgisayar
---

Korumalı mod bellekte yapılan işlemlerin kontrollu bir şekilde yapılmasını sağlayan bir sistemdir. Intel işlemcileri genel olarak *16* bitlik (Gerçek Mod) bir işlemci gibi çalışırlar, Gerçek modda koruma mekanızması yoktur, korumanın devreye sokulması programcı tarafından *32* bit yani Korumalı moda geçilerek yapılır. Peki bu modların birbirlerinden farkı nedir ? Hangisinde ne var ne yok bi bakalım.

## Real Mod (16 BIT)
*16* bit modda işlemci *8086*[^1] gibi çalışır. Çoğu işletim sistemi çalışmaya bu moddan başlasada içerdiği dezavantajlar sebebiyle bir süre sonra Korumalı Moda geçiş yapılır. Bu modda *16* bitlik yazmaçlar kullanılır. Genel olarak şunları sıralayabiliriz bu mod için:

* **1** MB bellek adreslenebilir.
* *BIOS* Kesmeleri[^2] ile çalışılabilir. 
* Sanal bellek ve bellek koruması yoktur.
* Yalnızca *16* bitlik yazmaçlar kullanılabilir.
* Yazmaçlar : *CS,DS,ES,SS,FS,GS*

Gerçek modda bellek erişimi *16* bit segment yazmacı ve yine *16* bitlik bir offset değeri ile gerçekleştirilir. Bu modda belleğe erişebilmek için segment yazmacındaki değer *16* ile çarpılıp offset değeri de buna eklenir. Böylece gerçek adres elde edilmiş olur.  Yani örneğin **CS** yazmaçındaki değer *07BE* olsa, **offset** değeride *0020* olursa gerçek adres `0x07BE * 16 + 0x0020 = 0x7C00` olur.

![](/files/adresleme16bit.png)

## Korumalı Mod (32 BIT)
Korumalı mod *Real* modda ortaya çıkan bazı sorunlara çözüm olarak üretilmiştir. Koruma mekanizması direkt olarak işlemci tarafından sağlanır. Temel amaç çalışan işlemin kendi bellek alanı dışına çıkmasını önlemektir. Bu tür bi koruma olmasaydı örneğin sistemin çalışması ile ilgili bir adresi bir pointer ile değiştirip sistem yapısı bozulabilirdi. Yinede bu durumla karşı karşıya kalabiliyoruz windowsda görmeye alışık olduğumuz mavi ekran hatalarının bazıları bu sebeptendir. Unix sistemlerde bunun karşılığı `segmentation violation` tarzı hatalardır. Korumalı modda çalışan işletim sistemlerinde genellikle **kernel mode(0)** ve **user mode(3)** adında iki mod bulunur. Aslında bu modlar *0,1,2,3* olarak *4* tanedir fakat sıkca kullanılan modlar **0** ve **3**. moddur. Çalışan kod kernel modda ise işlemci çalıştırılan koda kontrol mekanizmasını **uygulamaz**.  Korumalı moddaki bellek erişimi Real Moddaki gibi basit değildir. **GDT**(Global Descriptor Table) ve **LDT**(Local Descriptor Table) adlı tablolar sayesinde bir kaç aşamada bellek erişimi gerçekleşir. Sadece bununla kalmayıp, paging mekanızması aktif ise sayfa dizini ve sayfa tabloları da işin içine girmektedir. Ayrıca birde *virtual8086* modu denilen bir mod daha vardır, bu mod korumalı modun alt modu gibi düşünülebilir. Bir nevi korumalı mod içerisinde gerçek mod çalıştırılması olarak düşünülebilir. Korumalı modun genel özellikleri ise şunlardır:

* **4** GB Bellek adreslenebilir.
* Sayfalama ve Koruma mekanizması var.
* *BIOS* kesmeleri devre dışı.
* **16**'nın yanında **32** bitlik yazmaçlar mevcut

## Yazmaçlar (Registers)[^3]
*32* bit işlemcilerde *8086* işlemcilerinden kalma tüm yazmaçlar bulunur, bunlara ek olarak eklenen yazmaçlarda mevcuttur. Ayrıca bu yazmaçlar beraber kullanılabilir, yani hem `32 BIT EAX` hemde `16 BIT AX` yazmacı aynı anda kullanılabilir. Önceden gelen yazmaçlar dışında korumalı mod için birçok yazmaç eklenmiştir. Bunlar genel olarak Koruma, kontrol, debug ve test yazmaçları olarak gruplandırılabilir. Koruma yazmaçları *GDTR,LDTR,IDTR* ve *TR* yazmacı olarak **4** tanedir. Bu yazmaçlar başta değindiğim tabloları işaret eder.

**GDTR** : Bu yazmaç global tanımlayıcı tablosunu(**GDT**) işaret eden yazmaçtır. Bu tablo bellekte bulunan segmentlerin bilgilerini tutar. Bu bilgiler tanımlayıcı(descriptor) ismi verilen alanlarda tutulur. Her tanımlayıcı bellekteki segmentin *taban adresi*, *limiti*, *erişim hakları* gibi önemli bilgileri tutar.

**LDTR** : Yine diğeri ile aynı mantık, bu yazmaç ise **global tanımlayıcı tablosundaki bir tanımlayıcıyı gösterir.** Bu gösterilen tanımlayıcı ise yerel tanımlayıcı tablosunun(**LDT**) adresini tutar. Burası önemlidir, bu yazmaç *GDTR* gibi direkt olarak tablo adresini göstermiyor, tablonun *GDT*'deki tanımlayıcısını gösteriyor.

**IDTR** : Bu yazmaç da diğerleri gibi bu defa **IDT** tablosunu işaret eder. Bu tablo Kesme tanımlayıcı tablosudur. Korumalı modda *BIOS kesmeleri* çalışmadığı için programcı kesmeleri kendisi tanımlar ve bu kesmeleri yönetecek fonksiyonların adreslerini bu tabloda tutar. Bu tablo en fazla **256** girdi içerir çünkü toplam kesme sayısı bu kadardır.

Kontrol yazmaçları ise *CR0,CR1,CR2,CR3,CR4* olmak üzere **5** tanedir. Kontrol [yazmaçları](http://kutalmis.wordpress.com/) Korumalı moda geçmek için kullanılır ve hayati önem taşır.

**CR0** : *CR0* yazmacı korumalı modu aktif hale getirmeyi sağlar. Yazmacın **PE** adı verilen ilk biti(**0**) *1* yapılırsa gerçek moddan korumalı moda geçiş sağlanır. Ayrıca **PG** biti yani **31**. bit *1* yapılırsa paging mekanizması aktiflesir. Bunları yapmadan önce bazı hazırlıkların yapılması gereklidir.[^4]

**CR1** yazmacı bir işe yaramaz *rezerve* edilmiştir.

**CR2** : Bu yazmaç ise paging mekanizmasında bir hata oluşursa hata oluşan sayfanın adresini tutar, paging aktif değilse işe yaramaz. (*Page Fault Linear Address (PFLA)*)

**CR3** : Bu yazmaç sayfa dizin tablosu denilen tablonun adresini tutar. Sayfalama **aktifse** çalışır.

**CR4** : *Pentium IV* işlemcileri ile gelen bir yazmaçtır. 

Yazmaçlarla ilgili daha ayrıntılı bilgiyi [burada](http://en.wikipedia.org/wiki/Control_register) bulabilirsiniz. **CR0** yazmacının hangi bitinin ne işe yaradığınıda görebilirsiniz.

----
* Intel 8086 Mimarisi [Intel 8086](http://tr.wikipedia.org/wiki/Intel_8086)
* BIOS Kesmeleri [BIOS Interrupts](http://en.wikipedia.org/wiki/BIOS_interrupt_call)
* Wiki [WikiBooks](http://en.wikibooks.org/wiki/X86_Assembly) - [Kutalmis](http://kutalmis.wordpress.com/2009/10/21/intel-386-ailesi-ve-korumali-mod-yazilim-mimarisi/)
*  BrokenThorn [OSDev](http://www.brokenthorn.com/Resources/OSDev4.html)
