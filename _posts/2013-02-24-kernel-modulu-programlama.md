---
layout: post
title: Kernel Modülü Programlama
---

Bu sıralar biraz daha osdev konularına yoneldigimden ogrendigim seyleri de paylasayım dedim. Kernel modulu dedigimiz sey modulun tam karsiligi oluyor. Yani kernel'a sonradan eklenebilen/cikartilabilen kodlar. Yani bunlar kernel'ı direkt etkilemiyor, reboot atmadan da bunları gelistirebiliyorsunuz. Kısacası bu moduller olmasaydı, her zaman benim yapmaktan zevk aldıgim kernel compile olayını bilgisayarınıza gore 20-30 dk derleme yapmaniz gerekecekti. Standart halde de kernel ile beraber bazı moduller geliyor gormek icin `lsmod` kullanabilirsiniz(`cat /proc/modules`). Kernel'in standart yapısında iki tur loading turu var zaten, birincisi bu moduller yani dynamic loading denilen mevzu, digeride static loading denilen yani direkt kernel icerisinde olan elemanlar. Kernel gelistiricileri modulleri daha cok driver yazmak icin kullaniyorlar, burada ben klasik bir hello world! modulunu gosterecegim.

## Modullerin Yapisi
Kernel modullerinde her zaman olmasi gereken iki fonksiyon var. _init_module()_ ve _cleanup_module()_. Bunlardan ilki modul yuklendigi zaman, digeri ise bellekten ayrilma gerceklestiginde calisir. Ugrasanlar bilirler modul yuklemek icin linuxda `insmod` adli bir program var, bu eleman yukleme yapmak icin yazdıgınız modulun init_module() kismini calistirir. Modul icerisinde kullanilan yeni degiskenlerin de kayit edilmesi bu esnada gerceklesiyor, eger statik bir yapida yazilmis ise boot sırasında kayit islemi gerceklesiyor
bahsettigim dinamik yapida yazilmis ise init_module()_yuklenmesi sırasında kayit ediliyor. cleanup_module() ise modul bellekten ayirilirken calistiriliyor. Bu fonksiyonda `rmmod`'un gorevini ustleniyor diyebiliriz. Ornek bir modul su sekilde oluyor.

    #include <linux/module.h> //Tum modullerde bulunur.
    #include <linux/kernel.h> //KERN_INFO icin gerekli.

    int init_module(void){
        printk(KERN_INFO "Modul yuklendi. \n");
        return 0;
        /* 0 disinda bir deger donerse
        modul iceri aktarilamadi anlamına gelir. */
    }

    void cleanup_module(void){
    printk(KERN_INFO "Modul bellekten ayrildi.\n");
    }

C bilenler kodu zaten okuyacaktir, tek ayrinti burada printk kullanmamiz, printk'nin printf'den farkı sadece printk'da loglevel belirleyebilmemiz, linuxda suan su log levelleri var.

    cat /usr/include/sys/syslog.h | grep -i 'define LOG' | head -10

    #define LOG_EMERG   0   /* system is unusable */
    #define LOG_ALERT   1   /* action must be taken immediately */
    #define LOG_CRIT    2   /* critical conditions */
    #define LOG_ERR     3   /* error conditions */
    #define LOG_WARNING 4   /* warning conditions */
    #define LOG_NOTICE  5   /* normal but significant condition */
    #define LOG_INFO    6   /* informational */
    #define LOG_DEBUG   7   /* debug-level messages */

Dusunebileceginiz gibi, linux gerceklesen olayın onceligine gore log cesidi veriyor ve bu logları `/var/log/messages` dosyasına yazıyor.  Simdide kodu derleyip sisteme ekleyelim. Derlemek icin **Makefile** dosyamızı su sekilde olusturuyoruz.

    obj-m += modul.o

    all:
        make -C /lib/modules/$(shell uname -r)/build M=$(PWD) modules

    clean:
        make -C /lib/modules/$(shell uname -r)/build M=$(PWD) clean

Derleme islemini yapip modulu aktif hale getirelim.

    make
    sudo insmod modul.ko // İceri aktarma.
    lsmod | grep modul //Kontrol.
    sudo rmmod modul  // Modulun silinmesi.

Modulun iceri aktarilip aktarilmadigini kontrol etmek icin `tail -f /var/log/messages` izleyin. Sorun olmaz ise asagidakine benzer bir cikti olacak.


    Feb 24 20:14:11 bek dbus-daemon[662]: ** Message: No devices in use, exit
    Feb 24 20:15:13 bek kernel: [22606.768341] Modul yuklendi.
    Feb 24 20:15:20 bek kernel: [22613.941535] Modul bellekten ayrildi.


Son olarak modulunuz ile ilgili veya diger moduller ile ilgili bilgi almak isterseniz, `modinfo moduladi` seklinde gereken bilgileri cekebilirsiniz. Sonraki yazidada sistem cagrilari hakkında yazmayi dusunuyorum, baska oneriniz varsa mail ile onerebilirsiniz.
