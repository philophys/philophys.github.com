---
layout: post
title: Korumalı Modda Erişim Kontrolleri
categories: Bilgisayar
---

Selamlar

Kısa bir aradan sonra tekrar merhabalar, tekrardan yazmanın mutluluğu içerisindeyim, tatile gitmeden son bir yazı daha yazayım dedim. Ama kafamda şöyle bir fikir var, tatilde boş durmayıp, yazı yazmaya devam edip gelince yayınlayacağım sanırım. Bakalım... En son ağırlıklı tanımlayıcı yapılarını görmüştük dimi ? Şimdi aslında ilk başta anlatmak istediğim konuyu anlatmak istiyorum. O kadar diyoruz korumalı mod öyle her kafana estiğini yapamazsın, arkadaş bu adam bu korumayı, kontrolleri nasıl yapıyor ? İşte bugün onu göstermeye çalışacağım. Şimdi önceki yazılarda olan şeyleri hatırlamıyorsanız örneğin **DPL**, **RPL** değerleri gibi, dönün bir bakın derim. Korumalı modda erişim kontrolleri sayfa ve segment düzeyinde yapılır. Önce biraz daha kolay olan Sayfa düzeyinde erişim kontrollerinden bahsedelim.

## Sayfa Düzeyinde Erişim Kontrolü
Önceki yazıda da biraz bahsetmiştik bundan. Burada iki türlü koruma oluyor.  Bular ayrıcalık seviyesi ve yazma koruması kontrolu. Yazma korumasını önceki yazıdan gösteriştim aslında. Şimdi ilk Ayrıcalık seviyesini görelim.

Hatırlarsanız dizin/tablo girdilerinde **U/S** adlı bir bit vardı. **0** olması durumunda sistem sayfası oluyordu, **1** olduğunda ise kullanıcı sayfası oluyordu. Buradaki koruma olayı şöyle, U/S biti **0** olan bir sayfaya uygulama programcıları **erişemez**. Fakat **1** olanlara erişim serbesttir. Tabi okuyup yazma durumları R/W bitine göre değişir orası önceki yazıda var.

Diğer bir korumamız da yazma koruması kontroludur. Önceki yazıda şöyle tabloya benzer bir şey göstermiştim sizlere.

    | U/S  |  R/W  |  Uyg. Programcısı  | S. Programcısı |
	   0       0         Erişemez          Okur / Yazar
	   0       1         Erişemez          Okur / Yazar
	   1       0         Okuyabilir        Okur / Yazar
	   1       1         Okur / Yazar      Okur / Yazar

Buradaki koruma bundan ibaret. Yazma korumasında ise **U/S** biti ile değil de onun yerine **R/W** biti ile ilgileniyoruz. Tablodan gördüğünüz üzere sistem programcmız bu bitlerden hiç etkilenmişe benzemiyor. Kafası hep rahat. Ama hemen sevinmeyelim. Pentium işlemcilerle beraber **CR0** yazmacına **WP** isimli bir bit eklenmiştir. Bu bit sistem programcısını sayfa düzeyinde kısıtlayabilmektedir.[^1]

## Segment Düzeyinde Erişim Kontrolleri
Segment düzeyinde erişim kontrolu sayfa düzeyine göre daha ayrıntılıdır. Segment düzeyinde ise 3 çeşit kontrol mevcut. Bunları şimdi tek tek görelim.

**Limit Kontrolü**
Limit kontolu segmentlerdeki limit kısmıda göre yapılıyor adından da anlaşılabileceği gibi. Buradaki korumada bir segmenteki süreç bir adrese erişmeye çalıştığında eğer segmentin `taban+limit` toplamı o adresten küçükse, yani adres bu ikisinin toplamında büyükse erişim engellenir.

**Tip Kontrolü**
Tİp kontrolüde segment tanımlayıcılarındaki **S** biti ile ilgilidir. Tip kontrol yapılırken segmentin sistem/hafıza segmenti olup olmadığı, kod segmentiyse **CS** yazmacında bulunup/bulunmadığı gibi kontroller yapılır. Yani örneğin biz bir kod segmentine erişmek istiyorsak, kod yazmacında olan bir selektörle erişmemiz gerekiyor. Örneğin segmente çalıştırmak için erişim yapılıyorsa CS'de bulunan selektör bir kod segmentini veya bir gate'yi göstermeli.

**Ayrıcalık Kontolü**
Bu kontrol ise bu konularda araştırma yaptıysanız görüğünüz ring0, ring3, fault hataları gibi şeylerin altında yatan ana kontroldür. Sanırım önceki yazılardan birinde bahsetmiştik, korumalı modda 4 tane ring var. ring0 en yetkili seviye iken, ring3'de kullanıcı seviyesidir.(En kısıtlı seviye.) Bu kontrol tanımlayıcılardaki **DPL** denilen bir bite göre yapılıyor. **DPL** segmenin ayrıcalık düzeyini belirten bit idi. Ayrıca birde **RPL** denilen bir bit vardı, oda segment yazmaçlarındaki selektörlerde idi. Ayrıcalık kontrolü koruması işte bu ikisiyle yapılıyor.

Örneğin, mesela, diyelim ki, süreçlerden biri bir adrese erişmeye çalışıyor. Sürecin kod segmentinin CPL=3 olsun. CPL dediğimiz şey çalışmakta olan **kod** segmentinin **DPL** değeridir, farklı bir şey taşımaz yalnızca çalışan segmenti belirtmek için kullanılan bir terim diyelim. Erişim için kullandığımız selektörün RPL=3 olduğunu düşünelim. Eğer ki erişmeye çalıştığımız segmentin **DPL** değeri 3'den küçükse bu erişime izin verilmez. Bunu önceki yazıda da söylemiştim sanırım. Kısaca erişilecek olan segmentin DPL değeri bizim RPL değerimizden küçük olamaz diyebiliriz. 

Sonraki yazıda artık sanırım IDT kısmına giriş yaparım, tabii yazı ne zaman gelir orası muamma, malum bu konuda türkçe kaynak neredeyse yok, benimde ingilizcem çok iyi değil :) 

----
* [Kontrol Yazmaçları](http://en.wikipedia.org/wiki/Control_register)
* Yararlı kaynaklar [önceki Yazıda](post/hafiza-yonetimi-sayfalama-ve-segmentasyon-1/)
