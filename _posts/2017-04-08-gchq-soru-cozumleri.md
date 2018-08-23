---
title: GCHQ Soru Çözümleri
---

Selamlar

Teee 2011 yılında düzenlenen bir yarışma gibi bir şey varmış, ben ise bunu iki gün önce keşfettim. Serbest zamanlarımda uğraştım ve oldukça da zevk aldım. O nedenle blogda da paylaşmaya karar verdim. Bu yarışma gibi olan şey 3 aşamadan oluşuyor ve her aşama birbiriyle ilişkili. Çözüm sırasında tek sorun internet sitesinde lazım olan kısımların artık çalışmıyor olmasıydı fakat onu da sağ olsun *web.archive* arşivlemiş, o nedenle geriye kalan tek şey soruların çözülmesi oluyor... *Öncelikle eğer bu soruları kendiniz de çözmek istiyorsanız lütfen yazıyı şimdi okumayın, önce kendiniz çözmek için uğraşın ve en son seçenek olarak - <u>bu en son seçenekten önce gerekirse günlerce araştırma yapmanız, belki de sayfalarca doküman okumanız gerekebilir hiç fark etmez </u>- çözümlere yönelin.* Sorular nerede derseniz, aşağıdaki ilk resim birinci aşamanın başlangıcıdır... Ulaştığınız istekleri ise [bu](http://www.canyoucrackit.co.uk) adrese göndermeniz gerekiyor fakat şu anda ulaşacağınız adresler erişilemiyor, bu nedenle o adreslere ulaşmak için de *web.archive* servisinden yararlanmanız gerekiyor.

Fikrimce en çok 2. aşamada eğlendim. Lakin şu sıralar aşağı yukarı buna benzer bir şey üzerinde çalıştığım için karşıma bunun çıkması çok hoşuma gitti. Birinci ve üçüncü aşamada ise işin içine bazı kısımlarda şifreleme algoritmaları girdiği için biraz gözüm korkmuştu ama düşündüğüm kadar zor da değilmiş, biraz genel kültür(hehe) gerekiyormuş sadece..

### Birinci Aşama

Yarışmada herhangi bir ipucu verilmemiş sanıyorum. Tabi, internette bir çok çözüm var ama onlardan bakıp çözünce pek bir eğlencesi kalmıyor. Ama, kendi çözümlerinizden sonra onlara da bakmanızı tavsiye ederim. Çünkü bir sorunun birden fazla çözüm yolu olabiliyor ve bu yolları görmek eksiklerinizi gidermenizi, gelişmenizi sağlayabiliyor.

Bu ilk aşamada yalnızca bir adet resim verilmiş. O resim de şöyle:

![](/files/sibur.png)

Resmi ilk gördüğümde aklıma yine şifreleme algoritmaları geldi. Acaba dedim bu bir şifrelenmiş veri midir nedir? Fakat sonra gözüme `90`lar, `eb`ler, `cd` sonra iki yerde tekrarlanan `41 41 41 41`ler (bir de 42'ler) çarptı. Özellikle *41*'li kısmın iki kere geçmesi, aşağıdakinin veri, yukarıdakinin ise o verinin doğrulanmasında kullanılan değer olduğunu düşünmeme neden oldu. Bu sırada *42 42 42 42*'nin bir kere geçmesi de acaba eksik bir şeyler mi var diye şüpheye de düşürdü beni. Son olarak `90`'ın **nop**, `cd`nin **int**, `eb`li şeylerin ise **jmp**' olduğunu bildiğim için buradaki değerlerin bir assembly çıktısı olabileceğini düşündüm. Hatta `cd`den sonraki *80*, bunun `int 80` olabileceğini, haliyle linux altında çalıştırmama gerek olabileceğini aklıma getirdi. Fakat yine oradaki `cc` de oldukça ilginç. Lakin bu `int3` makine koduna denk geliyor ki bu da hata ayıklayıcının duraksamasına yol açan bir makine komutuydu. 

Test etmek için resimdeki veriyi, dışa aktardım (evet, tek tek elle yazdım).

```
eb 04 af c2 bf a3 81 ec   00 01 00 00 31 c9 88 0c
0c fe c1 75 f9 31 c0 ba   ef be ad de 02 04 0c 00
d0 c1 ca 08 8a 1c 0c 8a   3c 04 88 1c 04 88 3c 0c
fe c1 75 e8 e9 5c 00 00   00 89 e3 81 c3 04 00 00
00 5c 58 3d 41 41 41 41   75 43 58 3d 42 42 42 42
75 3b 5a 89 d1 89 e6 89   df 29 cf f3 a4 89 de 89
d1 89 df 29 cf 31 c0 31   db 31 d2 fe c0 02 1c 06
8a 14 06 8a 34 1e 88 34   06 88 14 1e 00 f2 30 f6
8a 1c 16 8a 17 30 da 88   17 47 49 75 de 31 db 89
d8 fe c0 cc 80 90 90 e8   9d ff ff ff 41 41 41 41
``` 

Şimdi öncelikle bunu çözüp kodu görmemiz lazım. Bunu yapmak için için bu veriyi .bin uzantısıyla kaydedip disassembler programında inceledim. Mesela başlangıcı ilginç gözüküyor:

```assembly
 =< 0x00000000      eb04           jmp 6                  ; 4 bayt aşağı git            
|   0x00000002      af             scasd eax, dword [rdi] ; ??????????????? 
|   0x00000003      c2bfa3         ret 0xa3bf             ; ???????????????
 -> 0x00000006      81ec00010000   sub esp, 0x100         ; Yığında yer aç (256)                  
```

Burada nedendir bilinmez en baştaki zıplama ile program `0x6` uzaklığından devam ediyor. Bunun mantıklı bir açıklamasını bu aşamayı çözerken bulamadım fakat kokusu sonra ortaya çıktı. Oraya da geleceğiz. Koda devam edersek:

```assembly
    0x0000000c      31c9           xor ecx, ecx               ; ecx = 0
 -> 0x0000000e      880c0c         mov byte [rsp + rcx], cl   ; [rsp + rcx] = cl
|   0x00000011      fec1           inc cl                     ; cl++
 =< 0x00000013      75f9           jne 0xe                     
    0x00000015      31c0           xor eax, eax               ; eax = 0
    0x00000017      baefbeadde     mov edx, 0xdeadbeef        ; edx = 0xdeadbeef
 -> 0x0000001c      02040c         add al, byte [rsp + rcx]   ; az önce ilklenen kısımdan i. veriyi al yazmacına koy
|   0x0000001f      00d0           add al, dl                 ; üzerinde edx'in düşük seviyeli kısmını ekle
|   0x00000021      c1ca08         ror edx, 8                 ; edx'deki veriyi sağa doğru 8 bit döndür
|   0x00000024      8a1c0c         mov bl, byte [rsp + rcx]   ; ilklenen kısımdaki i. verinin düşük bayt kısmını al
|   0x00000027      8a3c04         mov bh, byte [rsp + rax]   ; yığında rax uzaklıktaki yüksek bayt değeri bh yazmacına al
|   0x0000002a      881c04         mov byte [rsp + rax], bl   ; i. verinin düşük bayt kısmını rax uzaklığına koy
|   0x0000002d      883c0c         mov byte [rsp + rcx], bh   ; yığında rax uzaklıktaki yüksek bayt değeri i. verinin yerine koy
|   0x00000030      fec1           inc cl                     ; sayacı arttır
 =< 0x00000032      75e8           jne 0x1c                   ; taşana kadar devam
```

Burada az önce yığında açılan yer 1-256 arası artan değerler ile dolduruluyor. Sonrasında ise `0xdeadbeef` dağıtmalı olarak bu alanın ilklenmesinde kullanılıyor. Burada genel kültürüm olsaydı bunun *RC4* ile alakalı olduğu aklıma gelebilirdi fakat itiraf etmeliyim ki bu kısımda olayın *RC4* ile alakalı olduğunu öğrenebilmek için zaman harcamak zorunda kaldım...

Buranın hemen peşinde gelen kısım ise oldukça ilginçti ve hatta soruyu çözmeme vesile oldu diyebilirim:

```assembly
  |   0x00000039      89e3           mov ebx, esp        ; yığını ilk hale ayarla 
  |   0x0000003b      81c304000000   add ebx, 4          
  |   0x00000041      5c             pop rsp             
  |   0x00000042      58             pop rax             ; yığından ilk değeri çek
  |   0x00000043      3d41414141     cmp eax, 0x41414141 ; eax 41414141 mi?
  ==< 0x00000048      7543           jne 0x8d            ; değil (0x8d),  çıkış
 ||   0x0000004a      58             pop rax             ; yeni bir değer çek
 ||   0x0000004b      3d42424242     cmp eax, 0x42424242 ; yeni deger 42424242 mi?
 ===< 0x00000050      753b           jne 0x8d            ; değil, 0x8d'ye git (çıkış)
|||   0x00000052      5a             pop rdx             ; yığından bişiy al
```

Burada hata ayıklayıcı ile test ettiğimde, `41 41 41 41` değerinin alındığı, sonraki satırlarda ise `42 42 42 42` değeri beklenirken, onun yerine yığında yer alan geri dönüş adresinin alındığını gördüm. Bu da demekti ki yığındaki veride eksik olan bir şey vardı. `42 42 42 42`'nin "*BBBB*" demek olduğunu biliyordum. O halde aradığım şeyin başında bir imza olduğunu düşünebilirdim, ki öyle de yaptım. 

Sonrasında bu "*BBBB*"'li olan şeyin nerede olduğunu bulmaya çalıştım. Öncelikle *web.archive*'den sayfanın yarışma tarihindeki kaynak koduna baktım fakat oradan bir şey çıkmadı. İncelediğim yukarıdaki verinin içerisinde dikkatle farklı yerleri tanımsız hale getirip tekrar baktım fakat yine bir şey çıkmadı. Geriye elimde bir tek en başta verilen resim kalmıştı. Resmi açıp sağa sola yakınlaştırma yaptım, renk kodlarıyla oynadım fakat yine bir sonuç alamadım. Sonrasında bir de hex düzenleyici ile dosyaya bakmaya karar verdim.

Dosyanın hemen en başlarındaki şu kısım dikkatimi çekti:

![](/files/siburhex.png)

İşaretlediğim yerdeki sonda bulunan "==" kısmı hemen aklıma base64'ü getirdi. Sonrasında bu verinin en başta olmasını da akılda tutup acaba dedim *exif* bilgilerinde bir şeyler çıkar mı? Meğersem hakikaten oradaymış:

```
Compression                     : Deflate/Inflate
Filter                          : Adaptive
Interlace                       : Noninterlaced
SRGB Rendering                  : Perceptual
Pixels Per Unit X               : 2835
Pixels Per Unit Y               : 2835
Pixel Units                     : meters
Modify Date                     : 2011:08:05 14:18:51
Comment                         : QkJCQjIAAACR2PFtcCA6q2eaC8SR+8dmD/zNzLQC+td3tFQ4qx8O447TDeuZw5P+0SsbEcYR.78jKLw==
Image Size                      : 740x260
Megapixels                      : 0.192
```

Böyle bu tür resimli sorularda bu kısma ilk önce bakmanın faydalı olabileceğini de aklıma yazmış oldum. Daha sonrasında bu base64 ile "*encode*" edilmiş veriyi Python ile çözdüğümde şunu elde ettim:

```python
>>> "QkJCQjIAAACR2PFtcCA6q2eaC8SR+8dmD/zNzLQC+td3tFQ4qx8O447TDeuZw5P+0SsbEcYR.78jKLw==".decode("base64")
'BBBB2\x00\x00\x00\x91\xd8\xf1mp:\xabg\x9a\x0b\xc4\x91\xfb\xc7f\x0f\xfc\xcd\xcc\xb4\x02\xfa\xd7w\xb4T8\xab\x1f\x0e\xe3\x8e\xd3\r\xeb\x99\xc3\x93\xfe\xd1+\x1b\x11\xc6\x11\xef\xc8\xca/'
```

Aha! Dün şu baştaki "*BBBB*" kısmını görünce inanılmaz sevindim. Şimdi yapmam gereken şey ise bu veriyi en başta resmin içerisinden elde ettiğim verinin sonuna ekleyerek programı tekrar hata ayıklama işleminden geçirmekti. Bunun için aşağıdaki basit C kodunu yazdım, böylece programı derleyip çalıştırarak kolayca hata ayıklama yapabildim:

```c
...
int main()
{
	unsigned char shellcode[] = {
	0xeb, 0x04, 0xaf, 0xc2, 0xbf, 0xa3, 0x81, 0xec,   0x00, 0x01, 0x00, 0x00, 0x31, 0xc9, 0x88, 0x0c,
        0x0c, 0xfe, 0xc1, 0x75, 0xf9, 0x31, 0xc0, 0xba,   0xef, 0xbe, 0xad, 0xde, 0x02, 0x04, 0x0c, 0x00,
        0xd0, 0xc1, 0xca, 0x08, 0x8a, 0x1c, 0x0c, 0x8a,   0x3c, 0x04, 0x88, 0x1c, 0x04, 0x88, 0x3c, 0x0c,
        0xfe, 0xc1, 0x75, 0xe8, 0xe9, 0x5c, 0x00, 0x00,   0x00, 0x89, 0xe3, 0x81, 0xc3, 0x04, 0x00, 0x00,
        0x00, 0x5c, 0x58, 0x3d, 0x41, 0x41, 0x41, 0x41,   0x75, 0x43, 0x58, 0x3d, 0x42, 0x42, 0x42, 0x42,
        0x75, 0x3b, 0x5a, 0x89, 0xd1, 0x89, 0xe6, 0x89,   0xdf, 0x29, 0xcf, 0xf3, 0xa4, 0x89, 0xde, 0x89,
        0xd1, 0x89, 0xdf, 0x29, 0xcf, 0x31, 0xc0, 0x31,   0xdb, 0x31, 0xd2, 0xfe, 0xc0, 0x02, 0x1c, 0x06,
        0x8a, 0x14, 0x06, 0x8a, 0x34, 0x1e, 0x88, 0x34,   0x06, 0x88, 0x14, 0x1e, 0x00, 0xf2, 0x30, 0xf6,
        0x8a, 0x1c, 0x16, 0x8a, 0x17, 0x30, 0xda, 0x88,   0x17, 0x47, 0x49, 0x75, 0xde, 0x31, 0xdb, 0x89,
        0xd8, 0xfe, 0xc0, 0xcc, 0x80, 0x90, 0x90, 0xe8,   0x9d, 0xff, 0xff, 0xff, 0x41, 0x41, 0x41, 0x41,
        0x42, 0x42, 0x42, 0x42, 0x32, 0x00, 0x00, 0x00,   0x91, 0xd8, 0xf1, 0x6d, 0x70, 0x20, 0x3a, 0xab,
        0x67, 0x9a, 0x0b, 0xc4, 0x91, 0xfb, 0xc7, 0x66,   0x0f, 0xfc, 0xcd, 0xeb, 0xb4, 0x02, 0xfa, 0xd7,
        0x77, 0xb4, 0x54, 0x38, 0xab, 0x1f, 0x0e, 0xe3,   0x8e, 0xd3, 0x0d, 0xeb, 0x99, 0xc3, 0x93, 0xfe,
        0xd1, 0x2b, 0x1b, 0x11, 0xc6, 0x11, 0xef, 0xc8,   0xca, 0x2f };

	//
	// Fonksiyon göstericiylen çağır
	//
	typedef void (*shellcode_func)();
	shellcode_func fonk = (shellcode_func) shellcode;
	
	fonk();

	return 0;
}
```

Programı çalıştırıp hata ayıklama yaptığımda, önceki denemede gelmeyen `42 42 42 42` değerinin artık var olduğunu gördüm. Ardından devam edince biraz ilerde bir şifrelenmiş verinin çözülmesine benzer bir döngü başlıyordu. Çözülmesine benzer diyorum çünkü bir yerden alınan veri bir takım ekleme ve `xor` işlemlerinden geçiyordu. Genelde `xor` gördüğümüz yerlerde böyle bir varsayımı yapmak pek hatalı sonuç vermiyor. Akabinde döngü bitene kadar devam ettim ve verinin yazıldığı sırada izledim. Sonucunda şu manzara ile karşılaştım:

![](/files/asama1ahagetistegi.png)

Aha! Sanırım bulduk! Fakat sonuçta bize verdiği bu adres şu anda aktif değil. O nedenle yine *web.archive*'yi kullanarak sayfaya tekrar ulaştım. Bu defa bizi ilginç bir soru bekliyordu, ve bence en eğlenceli kısım da buydu. 

### İkinci aşama

Bu soruda bizden bir sanal makine tasarlamamız bekleniyordu. İlk bakışta göze biraz korkunç gelse de, eğer baştan pes etmezseniz gerçekten çok eğlenceli hâle dönüşen bir aşamaydı bu. Soruda bize bir **mem** değişkeni içerisinde bir veri verilmişti. Bu verinin tasarlanacak sanal makinede çalıştırılıp sonucun bulunması bekleniyordu. Bu sanal makinenin tasarlanabilmesi için de birtakım bilgiler verilmişti.

Bize verilen bilgiler arasında şunlar var (bu bilgiler arasında bahsettiğim **mem** değişkeni var, fakat biraz uzun olduğu için buraya koymuyorum, aşağıda kod ile beraber vereceğim):

```
cpu: {
    ip: 0x00,
    
    r0: 0x00,
    r1: 0x00,
    r2: 0x00,
    r3: 0x00,
    
    cs: 0x00,
    ds: 0x10,
    
    fl: 0x00,
    
    firmware: [0xd2ab1f05, 0xda13f110] // ??????
}
```

Bu üstteki yapıda özellikle *firmware*(donanım) kısmı ilginç. Çünkü sanal makine tasarımında hiçbir yerde kullanılmıyor. O halde bu nedir? Bu sorunun cevabı sonraki aşamada ortaya çıkıyor... Neyse... Tekrar sanal makinenin özelliklerine geçersek:

* Hafıza olarak 16 bayt uzunlukta segmentlere dayalı bir model kullanılıyor (segment:uzaklık şeklinde erişim olacak)
* 4 adet genel amaçlı yazmaç (r0, r1, r2, r3)
* 2 adet segment yazmacı (kod ve veri) (Cs ve Ds)
* 1 adet bayrak yazmacı (Flags)

Bunlar tasarlayacağımız CPU'nun(hehe) temel özellikleri. Bunun dışında bir de bu sanal makinede çalışacak komutlar, ve komutların yapısı hakkında bilgimiz var.

```
             ilk bayt         ikinci bayt(duruma göre)
bitler      [ 7 6 5 4 3 2 1 0 ]  [ 7 6 5 4 3 2 1 0 ]
işlem kodu    - - -             
mod                 -           
işlenen1              - - - -
işlenen2                           - - - - - - - -

işlenen1 her zaman için bir yazmaç indeks değeri veriyor
işlenen2 ise mod değişkenine ve kullanılan makine komutuna göre değişiyor
eğer mod 0 ise işlenen2 bir yazmaç indeksi gösteriyor
eğer mod 1 ise işlenen2 bir sabit değer veya hedef segmenti gösteriyor

---kullanılabilir işlem komutları---

* r1, r2 => birinci işlenen r1, ikinci işlenen r2
* movr r1, r2 => r2 yazmacının değerini r1 yazmacına al

işlem kodu |    işlem     |  işlenenler (mod 0) | işlenenler (mod 1)
-----------+--------------+---------------------+--------
  0x00     |     jmp      |    r1               | r2:r1
  0x01     |     movr     |    r1, r2           | rx,   sabit 
  0x02     |     movm     |    r1, [ds:r2]      | [ds:r1], r2
  0x03     |     add      |    r1, r2           | r1,   sabit
  0x04     |     xor      |    r1, r2           | r1,   sabit 
  0x05     |     cmp      |    r1, r2           | r1,   sabit 
  0x06     |     jmpe     |    r1               | r2:r1
  0x07     |     hlt      |    YOK              | YOK

bayrak durumu:

cmp r1, r2 sonucunda bayrak değişimi:
  r1 == r2 => Flags = 0
  r1 < r2  => Flags = 0xff
  r1 > r2  => Flags = 1

jmpe r1
  => eğer (Cpu.Flags == 0) jmp r1
      değilse bişey yapma

```

Evet, bu bilgiler sanal makineyi tasarlamamız için yeterli. Aslında soruda *JavaScript* ile yazmamız isteniyor fakat ben *C* ile yazdım. Siz de hangi programlama dili size uyarsa onunla yazabilirsiniz pek tabi.

Çok güzel olmasa da soruyu çözmeme vesile olan kodcuktan kısaca bahsetmek gerekirse... Öncelikle **mem** değişkenindeki veriyi `hlt` makine kodu gelene kadar kadar okuyup, işleyip, gerekli işlemleri yapan bir şey yazmam gerek diye düşündüm. Bu nedenle kafamda (biraz da kağıtta) şöyle bir şey kurdum:

* hafızadan bir bayt oku:
    * işlem kodunu, mod değerini, işlenen1 ve gerekirse işlenen2 değerini al
        * Hafızadan veri al, Ip değişkenini arttır
        * mod, işlem kodu ve işlenen1 değerini al
            * add, xor, cmp veya movr işlemleri ve mod 0 ise işlenen2'yi yazmaçtan al ve Ip değişkenini arttır
            * add, xor, cmp veya movr işlemleri ve mod 1 ise işlenen2 sabitini hafızadan al ve Ip değişkenini arttır
            * jmpe, jmp işlemleri ve mod 0 ise işlenen2'yi kod segmenti olarak ayarla
            * jmpe, jmp işlemleri ve mod 1 ise işlenen2'yi hafızadan oku ve Ip değişkenini arttır
            * hlt geldiyse döngüden çık
    * işlem koduna göre gereken işlemi gerçekleştirecek kodu çağır
        * jump işlemi geldiyse kod segmentini ve yeni Ip değerini belirle
        * movr işlemi geldiyse taşıma işlemi gerçekleştir
        * movm işlemi geldiyse yazmaca veya hafızaya yazma işlemi yap
        * add, xor geldiyse verilen işlenenler üzerinde işlemi yap
        * cmp geldiyse verilen işlenenleri karşılaşır ve bayrak değerini değiştir
        * jmpe bayrak durumuna göre ya hiçbir şey yapma, ya da belirtilen yere zıpla
    	* hlt komutu gelmediyse tekrar başa dön ve devam et

Bu kafamdaki şeyi biraz uğraşıp koda dökünce de aşağıdaki gibi bir şey oluştu. Yani tabi bu hale gelene kadar birçok kez hata ayıklama yapmam gerekti... Özellikle segment boyutlarının 16 olduğunu unutup, direkt olarak Segment + Offset ile veriyi almaya ve yazmaya çalışınca, bunu bulup düzeltmek biraz zor oldu. Demek ki okuduğumuzu daha dikkatli okumamız lazımmış hehe. Kod çok daha kısaltılabilir, iyileştirilebilir tabi fakat bu şimdilik hem işimi gördü, hem de bir disassembler nasıl yazılabilir gibi bir konuda çok hoş önbilgi edinmeme yardımcı oldu. Serbest bir zamanda bunu iyileştirip (mesela goto'lardan kurtulup hehehe), bir de python sürümünü yazmayı düşünüyoum inşallah.

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
// bekbek

struct _cpu_yazmaclar {
	unsigned char r0, r2, r3, r1, ip, cs, ds, flags;
} g_cpu = { 0 };

typedef struct _m_kodu {
	unsigned char mkodu    :3;
	unsigned char mod      :1;
	unsigned char islenen1 :4;
	unsigned char islenen2;
} mkodu;

unsigned char HAFIZA[] = {
	0x31, 0x04, 0x33, 0xaa, 0x40, 0x02, 0x80, 0x03, 0x52, 0x00, 0x72, 0x01, 0x73, 0x01, 0xb2, 0x50, 0x30, 0x14, 0xc0, 0x01, 0x80, 0x00, 0x10, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
	0x98, 0xab, 0xd9, 0xa1, 0x9f, 0xa7, 0x83, 0x83, 0xf2, 0xb1, 0x34, 0xb6, 0xe4, 0xb7, 0xca, 0xb8, // 2. seg
	0xc9, 0xb8, 0x0e, 0xbd, 0x7d, 0x0f, 0xc0, 0xf1, 0xd9, 0x03, 0xc5, 0x3a, 0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xcb, 0xcc, 0xcd, 0xce, 0xcf, 0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9,
	0xda, 0xdb, 0xa9, 0xcd, 0xdf, 0xdf, 0xe0, 0xe1, 0xe2, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0x26, 0xeb, 0xec, 0xed, 0xee, 0xef, 0xf0, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9,
	0x7d, 0x1f, 0x15, 0x60, 0x4d, 0x4d, 0x52, 0x7d, 0x0e, 0x27, 0x6d, 0x10, 0x6d, 0x5a, 0x06, 0x56, 0x47, 0x14, 0x42, 0x0e, 0xb6, 0xb2, 0xb2, 0xe6, 0xeb, 0xb4, 0x83, 0x8e, 0xd7, 0xe5, 0xd4, 0xd9,
	0xc3, 0xf0, 0x80, 0x95, 0xf1, 0x82, 0x82, 0x9a, 0xbd, 0x95, 0xa4, 0x8d, 0x9a, 0x2b, 0x30, 0x69, 0x4a, 0x69, 0x65, 0x55, 0x1c, 0x7b, 0x69, 0x1c, 0x6e, 0x04, 0x74, 0x35, 0x21, 0x26, 0x2f, 0x60,
	0x03, 0x4e, 0x37, 0x1e, 0x33, 0x54, 0x39, 0xe6, 0xba, 0xb4, 0xa2, 0xad, 0xa4, 0xc5, 0x95, 0xc8, 0xc1, 0xe4, 0x8a, 0xec, 0xe7, 0x92, 0x8b, 0xe8, 0x81, 0xf0, 0xad, 0x98, 0xa4, 0xd0, 0xc0, 0x8d,
	0xac, 0x22, 0x52, 0x65, 0x7e, 0x27, 0x2b, 0x5a, 0x12, 0x61, 0x0a, 0x01, 0x7a, 0x6b, 0x1d, 0x67, 0x75, 0x70, 0x6c, 0x1b, 0x11, 0x25, 0x25, 0x70, 0x7f, 0x7e, 0x67, 0x63, 0x30, 0x3c, 0x6d, 0x6a,
	0x01, 0x51, 0x59, 0x5f, 0x56, 0x13, 0x10, 0x43, 0x19, 0x18, 0xe5, 0xe0, 0xbe, 0xbf, 0xbd, 0xe9, 0xf0, 0xf1, 0xf9, 0xfa, 0xab, 0x8f, 0xc1, 0xdf, 0xcf, 0x8d, 0xf8, 0xe7, 0xe2, 0xe9, 0x93, 0x8e,
	0xec, 0xf5, 0xc8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
	0x37, 0x7a, 0x07, 0x11, 0x1f, 0x1d, 0x68, 0x25, 0x32, 0x77, 0x1e, 0x62, 0x23, 0x5b, 0x47, 0x55, // 3. seg
	0x53, 0x30, 0x11, 0x42, 0xf6, 0xf1, 0xb1, 0xe6, 0xc3, 0xcc, 0xf8, 0xc5, 0xe4, 0xcc, 0xc0, 0xd3, 0x85, 0xfd, 0x9a, 0xe3, 0xe6, 0x81, 0xb5, 0xbb, 0xd7, 0xcd, 0x87, 0xa3, 0xd3, 0x6b, 0x36, 0x6f,
	0x6f, 0x66, 0x55, 0x30, 0x16, 0x45, 0x5e, 0x09, 0x74, 0x5c, 0x3f, 0x29, 0x2b, 0x66, 0x3d, 0x0d, 0x02, 0x30, 0x28, 0x35, 0x15, 0x09, 0x15, 0xdd, 0xec, 0xb8, 0xe2, 0xfb, 0xd8, 0xcb, 0xd8, 0xd1,
	0x8b, 0xd5, 0x82, 0xd9, 0x9a, 0xf1, 0x92, 0xab, 0xe8, 0xa6, 0xd6, 0xd0, 0x8c, 0xaa, 0xd2, 0x94, 0xcf, 0x45, 0x46, 0x67, 0x20, 0x7d, 0x44, 0x14, 0x6b, 0x45, 0x6d, 0x54, 0x03, 0x17, 0x60, 0x62,
	0x55, 0x5a, 0x4a, 0x66, 0x61, 0x11, 0x57, 0x68, 0x75, 0x05, 0x62, 0x36, 0x7d, 0x02, 0x10, 0x4b, 0x08, 0x22, 0x42, 0x32, 0xba, 0xe2, 0xb9, 0xe2, 0xd6, 0xb9, 0xff, 0xc3, 0xe9, 0x8a, 0x8f, 0xc1,
	0x8f, 0xe1, 0xb8, 0xa4, 0x96, 0xf1, 0x8f, 0x81, 0xb1, 0x8d, 0x89, 0xcc, 0xd4, 0x78, 0x76, 0x61, 0x72, 0x3e, 0x37, 0x23, 0x56, 0x73, 0x71, 0x79, 0x63, 0x7c, 0x08, 0x11, 0x20, 0x69, 0x7a, 0x14,
	0x68, 0x05, 0x21, 0x1e, 0x32, 0x27, 0x59, 0xb7, 0xcf, 0xab, 0xdd, 0xd5, 0xcc, 0x97, 0x93, 0xf2, 0xe7, 0xc0, 0xeb, 0xff, 0xe9, 0xa3, 0xbf, 0xa1, 0xab, 0x8b, 0xbb, 0x9e, 0x9e, 0x8c, 0xa0, 0xc1,
	0x9b, 0x5a, 0x2f, 0x2f, 0x4e, 0x4e, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
};

unsigned char yazmac_islemi(unsigned char yazmac, unsigned char deger, unsigned char tip) {	
	unsigned char don = 0;

	switch(yazmac) {
		case 0: (tip == 0) ? (don = g_cpu.r0) : (g_cpu.r0 = deger); break;		
		case 1: (tip == 0) ? (don = g_cpu.r1) : (g_cpu.r1 = deger); break;
		case 2: (tip == 0) ? (don = g_cpu.r2) : (g_cpu.r2 = deger); break;
		case 3: (tip == 0) ? (don = g_cpu.r3) : (g_cpu.r3 = deger); break;
		case 4: (tip == 0) ? (don = g_cpu.cs) : (g_cpu.cs = deger); break;
		case 5: (tip == 0) ? (don = g_cpu.ds) : (g_cpu.ds = deger); break;
	}
	if (tip == 0)
		return don;
}

mkodu *mkodu_cek_isle(void) {
	mkodu *ins         = NULL;
	unsigned char bayt = 0;

	ins = malloc(sizeof(mkodu));
	if (!ins) exit(0);

	memset(ins, 0, sizeof(mkodu));

	bayt = HAFIZA[(g_cpu.cs << 4) + g_cpu.ip]; 
	g_cpu.ip++;

	ins->mod      = (bayt >> 4) & 0x1; // 0001
	ins->mkodu    = (bayt >> 5) & 0x7; // 0111
	ins->islenen1 = bayt & 0xf;        // 1111

	if(ins->mkodu == 3 || ins->mkodu == 4 || ins->mkodu == 5 || ins->mkodu == 1) {
		if(ins->mod == 0) {
			ins->islenen2 = yazmac_islemi(HAFIZA[(g_cpu.cs << 4) + g_cpu.ip], 0, 0); // ikinci işlenen yazmaçtan
			g_cpu.ip++;
		}
		else if(ins->mod == 1) {
			ins->islenen2 = HAFIZA[(g_cpu.cs << 4) + g_cpu.ip]; // ikinci işlenen hafızadan
			g_cpu.ip++;
		}
	}
	if(ins->mkodu == 6 || ins->mkodu == 0) {
		if(ins->mod == 0)
			ins->islenen2 = g_cpu.cs; // Atlama kendi kod segmentimiz içerisinde olacak
		else if(ins->mod == 1) {
			ins->islenen2 = HAFIZA[(g_cpu.cs << 4) + g_cpu.ip]; // Atlama başka bir segmente, hafızadan oku
			g_cpu.ip++;
		}
	}
	return ins;
}

int main(void) {
	g_cpu.ds   = 0x10;
	mkodu *ins = NULL;

	while ((ins = mkodu_cek_isle())->mkodu != 7 ) {
		switch (ins->mkodu) {
			case 0:
				g_cpu.cs = ins->islenen2;
			    g_cpu.ip = yazmac_islemi(ins->islenen1, 0, 0);
				break;

			case 1:
				yazmac_islemi(ins->islenen1, ins->islenen2, 1);
				break;

			case 2: {
				unsigned char uvd; // Uzaklik veya deger
				uvd = yazmac_islemi(HAFIZA[(g_cpu.cs << 4) + g_cpu.ip], 0, 0);
				g_cpu.ip++;

				if (ins->mod == 0) // veri segmentinden yazmaca oku
					yazmac_islemi(ins->islenen1, HAFIZA[(g_cpu.ds << 4) + uvd], 1);
				else // yazmaçtan veri segmentine yaz
					HAFIZA[(g_cpu.ds << 4) + yazmac_islemi(ins->islenen1, 0, 0)] = uvd; } // x << 4 -> x*2^4 = x*16
				break;
			
			case 3:
				yazmac_islemi(ins->islenen1, (yazmac_islemi(ins->islenen1, 0, 0) + ins->islenen2), 1);
				break;

			case 4:
				yazmac_islemi(ins->islenen1, (yazmac_islemi(ins->islenen1, 0, 0) ^ ins->islenen2), 1);
				break;

			case 5: {
				unsigned char kaynak = yazmac_islemi(ins->islenen1, 0, 0);
				(kaynak == ins->islenen2) ? (g_cpu.flags = 0) : (kaynak < ins->islenen2 ? (g_cpu.flags = 0xff) : (g_cpu.flags = 1)); }
				break;

			case 6:
				if(g_cpu.flags == 0) {
				    g_cpu.cs = ins->islenen2;
			    	g_cpu.ip = yazmac_islemi(ins->islenen1, 0, 0); }
				g_cpu.flags = 0;
				break;
			
			default: printf("Böyle bir makine kodumuz yok ki : %d:(", ins->mkodu); exit(0);
		}
	}

CIKIS:
	for (unsigned short i = 0; i < 768; i++)
		printf("%c", HAFIZA[i]);

	return 0;
}
```

Kodu derleyip çalıştırdıktan sonra hafıza alanını tekrar inceleyince aradığım şeye sonunda ulaşabildim:

![](/files/asama2getistegi.png)

Hmm, görünüşe göre başka bir dosya yine bizi bekliyor... Yine bu dosya sunucudan silindiği için **web.archive** üzerinde gezinmem gerekti. Şanslıyım ki, site bu dosyayı da arşivlemiş. O nedenle burdan kendilerine bi teşekkürümüz de olsun :B Bu arada, yukarıdaki kodu biraz düzenleyip, çalıştırılan komutları görmenizi de tavsiye ederim. Bu sayede elinizde bir disassembly çıktısı olacak ve yukarıda verilen işlem kodları bilgilerine göre kodu okuyabileceksiniz. Kod, önce kendi içerisindeki bir alanın **XOR** işleminden geçirip oraya dallanacak, sonra o yeni dallandığı yer de başka bir veriyi tekrar **XOR** işleminden geçirecek. Bunun sonucunda ise elinizde ihtiyacınız olan adres yer alacak...

### Üçüncü Aşama

Bu aşamada bize verilen dosyada lisans kontrolü gibi bir şey söz konusu. Eğer lisans doğru ise, bir web adresine erişim sağlanıyor. Ama adresin ne olduğu tam belli değil, onu bulmak da bize bırakılmış.

Uygulamanın bir yerinde şöyle bir kod parçacığı yakaladım:

```c
sprintf(Buffer, "GET /%s/%x/%x/%x/key.txt HTTP/1.0", "hqDTK7b8K2rvw", veri[0], veri[1], veri[2]);
```

Hmm, görünüşe göre bir bağlantı isteği için veri oluşturuluyor. Elimizde "*%s*" kısmı var, yani: "*hqDTK7b8K2rvw*". Şimdi ise veri[0], veri[1] ve veri[2] değerlerini bulmamız gerekiyor. Bunun için program içerisinde bu değerlerin geldiği kısımları takip ettim. Sonra gördüm ki bu arkadaş `license.txt` dosyasından **24** baytlık bir veri okuyor. İlk 4 baytın "*qhcg*" olup olmadığını test ediyor. Sonrasında sanıyorum bir tür parola ile ilgili bir kontrol daha var. 

```assembly
mov     eax, Salt ; Salt = hqDTK7b8K2rvw
mov     [esp+4], eax
lea     eax, [ebp+Dst]
add     eax, 4
mov     [esp], eax
call    crypt
```

Dosyanın içerisinde rastladığımız "*hqDTK7b8K2rvw*", ikinci argüman olarak verildiğine göre muhtemeldir ki standart [**crypt**](http://man7.org/linux/man-pages/man3/crypt.3.html) fonksiyonu ile ile şifrelenmiş bir parolanın, şifrelenirken kullanılan "*salt*" değeri.  Demek ki lisans dosyasının devamında bu şifrelenmiş olan esas parola olması gerekiyor. Sonradan çözümlere baktığımda gördüm ki bazı kişiler bu şifreyi kırmayı denemiş ve kırmışlar. Fakat programı analiz ettiğimizde buna gerek olmadığını görebiliyoruz. Lakin esas parola değil, parolanın hali hazırda şifrelenmesi için kullanılan "*salt*" değeri web sayfasına istek atarken kullanılıyor. Parola ise yalnızca programı çalıştırıp da kendiniz bir lisans dosyası oluşturursanız lisans dosyasının kontrol edilmesi sırasında işe yarıyor. O nedenle kırma konusuna hiç girmeden yalnızca kalan veri değişkenlerinin ne olduğunu bulmak ile ilgilenmek bence daha mantıklı.

Peki bu veri[0], veri[1] ve veri[2] değerleri nedir? Burada analiz sırasında lisans dosyası doğrulanmasına müteakip gösterilen şu mesajlar dikkat çekici:

```
...
loading stage1 license key(s)...
loading stage12 license key(s)...
....
```

Sanki birileri bize birinci ve ikinci aşamadan bir şeyler almanız lazım der gibi değil mi? Tam bu sırada ikinci aşamada sanal makine tasarımı sırasında anlam veremediğim "*firmware*" değerleri aklıma geldi. Hatırlarsanız 2 tane idiler. E bir de birinci aşamadaki kodun en başında bir zıplama vardı. Bu zıplama 4 baytlık bir yeri atlıyordu. Hmm, sanırım taşlar oturuyor şimdi. O zaman şöyle bir şey yapsak??

Birinci aşamadan -> `AF C2 BF A3` -> `0xa3bfc2af` <br>
İkinci aşamadan -> `[0xd2ab1f05, 0xda13f110]`     <br>
Üçüncü aşamadan -> `hqDTK7b8K2rvw`                <br>

O halde son istek adresi şöyle bir şey oluyor demektir : `/hqDTK7b8K2rvw/a3bfc2af/d2ab1f05/da13f110/key.txt`

Deneyelim fakat buraya da istek yapamıyoruz lakin kaldırmışlar. Fakat öncekilerde yaptığım gibi arşivlenmiş sayfaya ulaştığımda şöyle bir şey elde ediyoruz : `Pr0t3ct!on#cyber_security@12*12.2011+`. Evet, tahmin edebileceğiniz gibi ulaşmamız beklenen cevap bu!

Bu arada, lisans dosyasından 24 bayt değer okunurken bir uzunluk doğrulaması yapılmıyor :) Yani 24 bayt değil de belki 34827372831 bayt değer okursanız hafıza taşması gibi birtakım gariplikler ortaya çıkabilir... Hatta azcık daha ilerleteyim bunu lakin henüz gevreğim bitmedi hehe. Lisans dosyası kontrol edilirken ilk aşama olan "*qhcg*" ve ikinci aşama olan parolanın doğrulaması gerçekleştirilirse bir adet bayrak değeri 1 yapılıyor.

![](/files/paroladogrulama.png)

Sonrasında bu **LisansDogru** bayrağı eğer **1** ise, sunucuya istek atan başka bir fonksiyon çağırılıyor. Ama eğer **1** değil ise, çağırılmıyor. 

```assembly
loc_4011CF:                            
	cmp     [ebp+LisansDogru], 0 ; lisans doğru değil mi?
	jnz     short DOGRU
```

Peki bu ne işe yarar? Bu aşamanın çözülmesi sırasında birçok farklı yol izlenebilirdi. Biri benim yukarıda anlattığım sadece kodu inceleyerek olayı çözmek idi.(1) Bir diğeri ise **crypt** fonksiyonu aracılığı ile gizlenmiş parolanın bulunmasına gerek olmadığını ilk bakışta fark edemeyenler için parolanın kırılması idi.(2) Çünkü eğer bu parola lisans dosyasında olmaz ise, bayrak değeri 1 olmayacaktı (hoş çalışma zamanında bayrak değiştirilebilir tabi, bu da başka bir yol(3)). Bir diğer yol ise buradaki hafıza taşmasını kullanarak girdiğimiz parola doğru olmasa bile hafıza taşmasından yararlanıp bayrak değerini 1 yapmak, böylece de internet sitesine veri gönderen fonksiyonu çağırmaktı.(4) Tabi önünde sonunda anahtar değerlerini bulmak için önceki aşamalarda elde ettiğiniz işe yaramıyor gibi görünen değerleri hatırlamanız gerekiyordu, bu da sanırım yarışmanın dikkat ölçmesi ile biraz ilgili bir şeydi...

Daha birçok yol bulunabilir, ki bu da bu aşamanın eğitici olan tarafını gösteriyor. Bir sonuca başka yollardan ulaşabilmek oldukça eğitici oluyor diye düşünüyorum. Umarım sizin için de öyle olmuştur... 

Neyse... Son olarak [web sayfasında](http://www.canyoucrackit.co.uk) az önce elde ettiğimiz bu değeri girince de, aşamaları bitirdiğinize dair bir mesaj alıyorsunuz ve iş için başvurmanız konusunda teşvik ediliyorsunuz hehe. Tee 2011 yılında olsa bile bence çok güzel bir yarışmaymış. Dediğim gibi özellikle ikinci aşamadaki soru benim çok hoşuma gitti. Sonra öğrendim ki böyle benzer sorular bazı CTF yarışmalarında da çıkıyormuş, sanırım sonraki durağım da onlar olacak.


Sevgiler...
