---
layout: post
title: Bootloader nedir ? Nasıl yazılır ?
categories: Bilgisayar
---

Selamlar, isletim sistemi gelistirirken ilk yapmanız gererek sey isletim sisteminin açılabilmesi için bir *bootloader* yazmaktır. Bootloader dedigimiz sey **BIOS** tarafından çagırılır ve direkt olarak CPU tarafından çalıstırılır. Ve hafızadaki *ilk* 512 baytlık bir `sector`'de tutulur, 1 *sector* 512 baytlık degere sahip gruplardır. Bu önemli bir ayrıntı çünkü yazılan bootloader'lar bu bölümü asmamalıdır. Bootloader'ın yüklenecegi alan adresi de bellidir : `0x7c00` Örnegin linuxk ernel'ın `boot.s` dosyasına baktıgınızda söyle birsey göreceksiniz.

> boot.s is loaded at 0x7c00 by the bios-startup routines, ...

Peki tüm bunlar nasıl oluyor ?, örnegin power butonuna bastıgınızda basitçe neler oluyor ? Kabaca tusa bastıgınızda anakartınıza bir elektronik sinyal gidiyor, ardından anakart bu sinyali *PSU* yani güç kaynagına yönlendiriyor, bu gelen sinyal tek bit bir veri içeriyor, **0** veya **1**. Eger gelen data 0 ise herhangi birsey olmuyor yani bilgisayar kapalı durumda, ama gelen data degeri 1(aktif sinyal) ise güç verilmeye baslanacak demektir. *PSU* bu aktif sinyali alınca sisteme güç verir bir dizi islemden sonra PSU eger sorun çıkmamıs ise anakartdaki *BIOS*'a `power_good` sinyali gönderir. Ardından *BIOS POST* olarak adlandırılan bir islem gerçeklestiriliyor fakat uzamaması için onu yazmayacagım, bios post isleminden sonra *BIOS* kontrolu ele alıyor, aldıktan sonra yine bazı islemler yapıyor (IVT olusturma gibi), ardından bios bir isletim sistemi bulmaya çalısıyor ve bootable aygıt bulmak için *0x19* adlı Interrupt'u çagırıyor eger herhangi bir sistem bulamazsa bilgisayar kapanıyor bulursa sistem açılıyor. *0x19*(Bootstrap loader) bulunan bootable aygıtın 1. sectorune bakıyor ve bunun bir isletim sistemi olup olmadıgını kontrol ediyor, bootloader'ın ilk sectorde olmasının sebebi budur. Interruptlar birçok program tarafından çalıstırılabilir, `0x0` adresinde IVT[^1] isimli bir tabloda tutulurlar.

Şimdi Assembly ile örnek bir bootloader nasıl olur, söyle olur.

    org     0x7c00 ; Bahsettigim bootloader adresine yüklenecegini belirtiyor.
     
    bits    16     ; 16 Bit Real mod
     
    basla:
     
        cli        ; Tum Interruptları kapat.
        hlt        ; Sistemi kapat
        
    times 510 - ($-$$) db 0 ; Boyut tescili
     
    dw 0xAA55      ; Boot imzası

16 Bit modu eski zamanlardaki DOS sistemlerden geliyor, o zamanki isletim sistemiler 16 bit modda çalıstıgı için x86 ailesi de bu sistem ile uyumlu olarak çalısabiliyor. Bu modlar **16**, **32**, **64** bildiginiz gibi gidiyor fakat onlar apayrı bir dünya, kelime olarak 16 bit Real mod, 32 bit korumalı mod, 64 bit ise long mod olarak geçiyor, örnegin linux 32 bit bir yapıda çalısırken önce 16 bir moddan baslar ardından **32** bit yani korumalı moda geçer, bunun sebebi 16 bit yani Real mod'un yetersizligi diyebiliriz. Yetersizlikten kastım su 16 bit modda su kısıtlamalar var:

* 1MB Bellek kısıtlaması
* 16 Bit register sınırlaması.
* Bellek koruması veya sanal bellek yok.

Linux ve/veya windows korumalı moda geçtiginde bu sınırlamalar ortadan kalkmaz fakat degisir, örnegi 4GB ram kullanabilirsiniz gibi.
Koda bakmaya devam ettigimizde gördügünüz `cli` yazının basında bahsettigim Interruptları kullanıma kapatıyor, unutmayın ki bu Interrupt'lar sadece Real modda kullanılabilirler, bu nedenler modlar arası geçiste bunlar kapatılır, `hlt` ise sistemi kapatıyor. Burdan sonraki iki satırın yaptıgı sey oldukça önemli `times 510 - ($-$$) db 0` kısmı 512 baytdan fazla olan yerleri 0 ile temizliyor, buradaki `$` o anki satırın adresini temsil ediyor `$$` ise ilk adresi temsil ediyor (0x7C00 olmalı) yani `$-$$` o satırdan ilk satıra kadar olan kısmın boyutunu gösteriyor yani programın boyutunu diyebiliriz, kısaca, burada son iki bayt hariç tüm baytlar 0 ile doluyor, `dw 0xAA55` ise hatırlarsanız *BIOS* **0x19** Interrupt'u ile bootable bir disk arıyordu, peki diskin bootable oldugunu nasıl anlıyor ? İste bu imza ile, *511*. bayt **AA** *512*. bayt ise **55** ise *BIOS* bunun bootable olduguna karar veriyor. İsterseniz programı birde bu satırı silerek çalıstırmayı deneyin, program çalısmayacaktır. Son olarak bu imza programın son iki baytından yer almalıdır, Bu basit programı çalıstırmak için `nasm` kullanarak su sekilde derlememiz gerekiyor: `nasm -f bin boot.asm -o boot.bin` -f parametresi çıkacak olan dosyanın binary dosyası olması gerektigini belirtiyor, ardından *qemu* veya *bochs* kullanarak çalısıp çalısmadıgını test edebilirsiniz. Baslattiginizda Booting from ... gibi, bir mesajla karsılasmanız gerekiyor, peki biz bu mesaj yerine kendi mesajımızı nasıl yazarız bunun için 16 bit modda baska bir *BIOS Interrupt*'unu kullanacagız. Bu arada önceden de dedigim gibi, bu Interrupt'lar yalnızca 16 bit modunda çalısır, yani siz *pmode*'ye geçtiginizde bunlar çalısmayacak, kendi kodunuzu yazmanız gerekecektir. Şimdi ekrana karakter yazabilmek için **0x10** kesmesini, **0x0E** fonksiyonunu kullanacagız, bunu yapabilmek için bazı degerlerin tanımlanması gerek;

* AH = 0x0E (fonksiyon)
* AL = Yazılacak karakter
* BH - Sayfa numarası (0)

Buradaki *AH*, *AL*, *BH* gibi kaydedicilerin neleri depolayabildigini küçük bir arastırma ile bulabilirsiniz, tabi buraya kadar sıkılmadan okuduysanız :) Şimdi basitçe bu kaydediciler su sekilde dolmalı:

    xor bx, bx      ; bx=0
    mov ah, 0x0e    ; AH=0x0E
    mov al, 'A'     ; Yazılacak karakter
    int 0x10        ; Interrupt

Anlasılacagı gibi, *A* karakteri yazdırıyoruz, peki bir cümle nasıl yazarız ? Yine aynı kesme ve fonksiyonu kullanarak fakat biraz daha farklı bir yapı ile. Örnek olarak:

    bits    16          ; 16 Bit Real Mod
    org     0x7c00      ; 0x7C00 adresine yükleniyoruz.

    start:
        jmp yukleyici       ; yukleyici kısmına atla.

    msg db  "mefurOS, Aciliyor...", 0   ; Yazılacak cumle

    ; Yazma Fonksiyonu
    yaz:
        lodsb                   ; Cumlenin sonraki baytı SI - > AL
        or          al, al      ; AL=0 mı ?
        jz          yazbitti    ; jz : dogru ise yazbitti'ye atla (kosul)
        ; Burada yazma isleminin birden fazla yapılmaması saglanmakta.
        mov         ah, 0x0E    ; Fonksiyon 
        int         0x10        ; Kesme
        jmp         yaz         ; Bos sonlandırıcı gelene kadar tekrarla.
    yazbitti:
        ret                     ; İs bitti. 


    ;Yukleyici
    yukleyici:

        mov si, msg     ; Yazılacak mesajı index kaydedicisine(si) aktar.
        call    yaz     ; Yazdırma icin fonksiyonu cagir

        cli             ; Kesmeleri temizle
        hlt             ; Sistemi kapat.
        
    times 510 - ($-$$) db 0  ; ...

    dw 0xAA55           ; Boot imzası

Önceki sekilde programı derleyip *qemu* ile çalıstırdıgınızda ekranda `mefurOS, Aciliyor...` seklinde bir ifade goreceksiniz. Böylelikle basit bir bootloader yazmıs oldunuz, bazılarınız o kadar dil varken neden Assembly diyor olabilir, ilk sebep basta belirttigim gibi, bootloader gibi low level program yazmanın kuralıdır bu, yani bu tür program yazıyorsan asm ile yazacaksın diyebiliriz ki zaten C ile bu tür bir program yazılmıyor, en azından ben görmedim. Ayrıca neden low level language sorusunada söyle güzel bir alıntı yapmadan edemeyecegim:

>  Asagı seviyeli programlama bilgisi bilinç düzeyini artırır. Böylece problemlerin nedenleri daha iyi anlasılır. 

----
* Interupt Vector Table - bakınız [Wikipedia](http://en.wikipedia.org/wiki/BIOS_interrupt_call)
