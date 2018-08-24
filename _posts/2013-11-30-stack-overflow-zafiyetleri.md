---
layout: post
title: Stack Overflow Zafiyetleri
categories: Bilgisayar
---

*Low-level* guvenlik zafiyetlerinde belki de en cok gorulen acik turlerinden biri olan stack overflow hakkinda bir iki ufak sey karalamak istiyorum uzun aradan sonra, cumle de cok degisik oldu. Simdi oncelikle bu cok degerli arkadasimiz stack denilen bir bolge ile ilgili oldugundan once onu bir acikliga kavusturalim.

## Stack ? O da nesi ?
**Stack**, *data*, *code* segmenti gibi bir segmenttir. Resmi görelim.

![](/files/stac1.jpg)

Stack'i biraz daha dışlanmış gibi düşünebiliriz aslında. *Stack* bir nevi işi düştüğünde gidilen dost gibidir. Bu segmentte mesela işlem sırasında bir fonksiyon çağırdınız, veya fonksiyon içerisinde değişkenler var bu zamanlarda buraya başvuruyoruz. Örneğin **C** dili ile bir program yazdınız ve programınızda bazı yerel değişkenler var, işte bu burada tutuluyor, programınızda bir fonksiyon çağırdınız bu fonksiyonun istediği parametreler ve fonksiyondan sonra geri döneceğiniz adres yine burada saklaniyor. Bunu en iyi [İbrahim Balic](http://ibrahimbalic.com/2013/fuzzerfuzzing-kavrami-ve-guvenlik-zafiyetleri-bolum-1/) tarafindan yazilan yazidaki bir resimle ifade edebilirim. Bakınızz.

![](/files/stac2.jpg)

Ayrıca sırf zevkine de kullanabilirsiniz, gönder, geri al. gönder, geri al. Diğer alanları merak eden arkadaşlarımız google amcamızı kullanabilirler.

### Fonksiyon Çağırıldığında Olanlar
Simdi programınızda bir fonksiyon cagirdiniz, ve program o fonksiyonda calisiyor su anda. Ardindan fonksiyonun gorevi bitti ve program yine o kaldigi yerden calismaya devam etti. Peki bu nasıl oldu ? Durup düşünmek gerek değil mi ? Ya da düşünmeyin, anlatayım. Ornek bir kod parcasi uzerinden gidelim.

    sayi = 5;
    biseylerYap(5,3,5);
    sayi = 10;

Burada oncelikle sayi degiskeninin degeri *5* yapıldı, ardindan program **biseylerYap** fonksiyonunu cagirdi ve fonksiyon gorevini bitirdi, geri geldiginde *sayi* degiskenine **10** degerinin verildigi yerden devam etmeli. İste bunun olabilmesi için **biseylerYap** fonksiyonu cagirildiginda bir takım işlemler oluyor orada. Bu işlemler [function prologue](http://en.wikipedia.org/wiki/Function_prologue) ismi altında toplaniyor. Peki nedir bu işlemler? Program içerisinde bir **CALL** instruction'ı gerçekleşirse, oncelikle fonksiyonu cagirdiktan sonraki instruction adresi stack'a gönderilir. Ardından fonksiyon çağırılır, fonksiyon işlemi bitirdiğinde stackde bulunan instruction adresi tekrar **EIP** yazmacına çekilerek programın kaldığı yerden çalışması sağlanır. Ayrıca çağırılan fonksiyonla beraber fonksiyon içerisindeki local değişkenler yine stack'de tutulacağından **ESP** değeri de değişecektir. Yani bu durumda programın eski durumdan devam etmesi için **ESP** değeride geri dönüldüğünde aynı kalmalı. Bunu sağlamak için ESP EBP yazmacına kopyalanıp stacke gönderilir. Yani özetlersek yapılan 3 ana işlem oluyor.

1. Fonksiyon çağırıldıktan sonraki instruction adresi yığına gönderiliyor.
2. **EBP** korunabilmesi için kopyalanıp yığına gönderiliyor, yeni stack base adresi fonksiyon çağırıldığı sıradaki esp değerini alıyor.
3. Fonksiyon çağırılıyor, bitiyor ve geri dönülüyor.

Şimdi bunu görebilmek için aşağıdaki örnek kodumuzun assembly çıktısına bakalım. Öncelikle *gcc* ile şu şekilde derleme yapıyoruz. `gcc.exe Untitled1.c -S -o bek.S`

    #include <string.h> 

    void cayDemleyici(int sayi){
        char gereksiz[5];
    }
    int main (int argc, char **argv){
        cayDemleyici(1);
    }

**bek.S** içerisinde programın assembly halini görebiliriz. Şimdi ben size **function prologue** olarak adlandırılan kısmı göstereyim.

    pushl    %ebp
    movl    %esp, %ebp
    call    _cayDemleyici

Gördüğünüz gibi, öncelikle base pointer değeri yığına gönderilip saklanıyor, ardından yani base pointer değeri stack pointerın değeri ile değiştiriliyor ve fonksiyon çağırılıyor. Fonksiyondan çıkarken de function epilogue denilen işlemler uygulanıyor. Bunlarda bunun tersi zaten. İkisini özetletsek

    ;prologue
    push        ebp                ; ebp saklaniyor
    mov         ebp, esp           ; ebp->esp
    call        function           ; fonksiyon gelsin

    ;epilogue
    mov         esp, ebp      	   ; esp->ebp -eski haline donuyor-
    pop         ebp                ; ebp degeri stackden alınıyor.
    ret                            ; fonksiyondan donuluyor.

Böyle birşey oluyor işte, daha fazlası için google'a başvurabilir, veya [şuradaki](http://stackoverflow.com/questions/14765406/function-prologue-and-epilogue-in-c) yeterince açıklayıcı cevaba da bakabilirsiniz.

## Peki Stack Overflow ?
Stack overflow, format string, use after free veya double free gibi güvenlik zafiyetleri ile beraber anılan bir zafiyet türü. Temeli stack alanının dolup taşırılmasına, bununla beraber programın akışının **EIP** yazmacının değerinin değiştirilerek başka yonlere çekilmesine dayaniyor diyebiliriz. **EIP** yazmaci instruction pointer olarak adlandirilir, ve programda calistirilacak bir sonraki kodun adresini tutar. Siz bu adresi degistirirseniz programin akisini istediginiz sekilde degistirebilirsiniz. Burada rol oynayan iki yazmaçtan da bahsetmemiz gerekiyor. Bunlar **EBP**(Base Pointer) ve **ESP**(Stack Pointer) yazmaçları. **EBP** stackin başlangıcını gösterir. ESP ise yapılan push pop işlemlerine göre değişir, yani stack büyür, küçülür buna göre değişir bu yazmaç. *LIFO*'dan bahsetmiyorum, googleda bulabilirsiniz. Ayrıca stack aşağıya doğru büyüyen bir yapıdır. Yani **ESP** değeri *0xFF* gösterirken bir `PUSH EAX` işlemi gerçekleştirirseniz **ESP** *0xFC* değerini alır, yani gördüğünüz gibi aşağıya doğru büyümekte. 

Şimdi şöyle küçük bir programımız var, ilk bakışta çok zararsız.

    #include <string.h> 

    void cayDemleyici(char *Buffer){
        char yeniDegisken[100];
        strcpy(yeniDegisken,Buffer);
    }
    int main (int argc, char **argv){
        cayDemleyici(argv[1]);
    }

Olay gayet net, konsoldan argüman olarak bir değer alınıyor, ardından bu değer fonksiyon içerisinde tanımlanan **yeniDegisken** isimli *100* baytlık alana kopyalaniyor. Peki buraya daha buyuk bir değer geldiğini düşünelim, işte o zaman stack overflow denilen zafiyet meydana geliyor. Programi derledikten sonra `output.exe AAAAA` seklinde calistirdiginizda bir hata vermeden alt satira geciyor olmali. Cunku verdigimiz arguman *100* hanenin üstünde degil, bir hata oluşmuyor. Birde buyuklugu 100den fazla olan birsey girelim bakalim ne oluyor.... Denediniz mi ? Hata aldınız ve program kapatıldı. Evet işte burada **stack overflow** hatası meydana geldi. Burada olan şey aslında şu, siz yığını taşırdığınız zaman **EIP** uzerindeki yani programın sonraki gideceği adresi aslında olmayan bir adres ile değiştiriyorsunuz, program bunu bulamayınca çıkmaza giriyor ve çöküyor. Bunu biraz somutlaştırmak için stackin o andaki durumunu canlandıralım.

    ESP|-----------------------|
       |                       |
       | yeniDegisken icin     |
       |   ayrilan alan        |
       |                       |
    EBP|-----------------------|
       | Saklanan EBP          |
       |-----------------------|
       | Saklanan EIP          |
       |-----------------------|
       | fonksiyona giden arg. |
       |   argv[1]             |
       |-----------------------| 

Stacki bu hale getiren kod kısmının disassembly edilmis hali sudur:

    004016B0  /$  55            PUSH EBP                                 ;   ; ebp saklaniyor
    004016B1  |.  89E5          MOV EBP,ESP                              ;   ; new ebp (esp->ebp)
    004016B3  |.  81EC 88000000 SUB ESP,88                               ;   ; yeniDegisken icin yiginda yer aciliyor
    004016B9  |.  8B45 08       MOV EAX,DWORD PTR [EBP+8]                ; | ; [EBP+8] -> argumanimiz EAX yazmacina alindi
    004016BC  |.  894424 04     MOV DWORD PTR [ESP+4],EAX                ; | ; EAX'deki arguman yiginda ESP+4 adresine yerlesti
    004016C0  |.  8D45 94       LEA EAX,DWORD PTR [EBP-6C]               ; | ; EBP-6C'nin adresi EAX yazmacina alindi (dest)(yeniDegisken)
    004016C3  |.  890424        MOV DWORD PTR [ESP],EAX                  ; | ; EBP-6C adresi ESP'ye aktarildi
    004016C6  |.  E8 AD1F0000   CALL <JMP.&msvcrt.strcpy>                ; \ ; strcpy cagirildi
    004016CB  |.  C9            LEAVE                                    ;   ; epilogue islemini saglayan komut

Burada eklemek isterim ki **LEAVE** calistirilmadan once *ESP=0023FE50*, *EBP=0023FED8*. **LEAVE** geldikten sonra *ESP=0023FEDC*, *EBP=0023FEF8* yani **prologue** islemine girmeden onceki halleri, sanirim artik anladiniz.

Bu komutlar dondugu sirada(call calistirilmadan) stack'in durumu su sekilde.

    0023FE50   0023FE6C  |dest = 0023FE6C (0023FE6C -> EBP-6C=yeniDegisken)
    0023FE54   003E1048  \src = "AAAAAA"
    0023FE58   0023FE64
    0023FE5C   00000004
    0023FE60   00000000

Overflow olacağı zaman ise işler şu şekilde değişecek, öncelikle stack taşmadan olanı görelim.

    ESP|-----------------------|
       |                       |  | 
       | DDDDDDDDDDDDDDDDD     |  |
       |  DDDDDDDDDDDD         |  | strcpy fonksiyonunun
    EBP|-----------------------|  |     yazma yonu
       | Saklanan EBP          |  |(asagi dogru, ok olmadi :) )
       |-----------------------|  +
       | Saklanan EIP          |
       |-----------------------|
       | fonksiyona giden arg. |
       |   argv[1]             |
       |-----------------------| 

Normal şartlar altında görebileceğiniz üzere stack taşması olmayacağından bir sorun yok gibi, fakat biz stack'i taşıracak bir argüman ile çalıştırırsak programı, işlerin rengi şu şekilde değişiyor

    ESP|-----------------------|
       |                       |  | 
       | DDDDDDDDDDDDDDDDD     |  |
       |  DDDDDDDDDDDD         |  | strcpy fonksiyonunun
    EBP|-----------------------|  |     yazma yonu
       | DDDDDDDDDD (EBP)      |  |
       |-----------------------|  +
       | DDDDDDDDDDDDD (EIP)   |
       |-----------------------|
       | DDDDDDDDDD  argv[1]   |
       |-----------------------| 

Gordugunuz uzere ayrilan alan asildi ve EBP, EIP degisti, ve programın gidecegi yer degismis oldu, tabii burda mantikli bir degisim olmadigindan sonuc cokme ile sonuclaniyor.

Şimdi bunun bir debugger yardimiyla somutlastirip yazmaçları nasıl etkiledigini gorelim. Simdi ben *OllyDbg* kullanarak programı açıyorum, ardından **Debug->Arguments** seçip **CommandLine** kısmına *120* adet **D** harfi yaziyorum. Ardından programı çalıştırıyorum ve program normal olarak çöküyor.

![](/files/stac3.png)

Yukarıda yazmaçların durumunu görüyorsunuz. *EBP* ve *EIP* yazmaçları dikkatinizi çekmiş olmalı `44444444`, bunun ne alakası var derseniz *hexdecimal* olarak *44* ascii tabloda **D** harfini işaret ediyor. İnanmayan [bakabilir](http://www.asciitohex.com/). Yani gördüğünüz gibi *Stack* taşmış ve verdiğimiz değer programın akışını değiştirebilecek olan **EIP** yazmacının değerini etkilemiş. Bu sırada stack'de buna benzer degerler ile dolu durumda olacak. Peki bu durumdan kaçınmak için ne yapmak gerekiyor ? Aslında olay çok basit *strcpy* yerine bu fonksiyonun guvenli hali olan *strncpy* kullanmanız yeterli olacak. Neden diye sorarsanız [şuraya](https://www.opensource.apple.com/source/Libc/Libc-262/ppc/gen/strncpy.c) bakabilirsiniz, veya biraz stackoverflowda zaman geçirmek yeterli olacaktır.

----
*  [Corelan Stack Overflow](https://www.corelan.be/index.php/2009/07/19/exploit-writing-tutorial-part-1-stack-based-overflows/)
*  [Enderunix BOF](http://www.enderunix.org/docs/bof.txt)
*  [Shellcoder's handbook](http://www.amazon.com/The-Shellcoders-Handbook-Discovering-Exploiting/dp/047008023X)
*  [Asciitohex](http://www.asciitohex.com/)
