---
layout: post
title: Linux Sistem Çagrıları
categories: Bilgisayar
---

Selamlar, onceki post'da da bahsettigim uzere bu defaki konumuz sistem cagriları. Sistem cagrilarindan bahsetmeden once onceki yazıda bahsetmeyi dusundugum fakat bahsetmedigim bir iki sey daha gostermek istiyorum. Modul makroları hakkında bir kac sey gosterecegim. Makroları kullanarak init ve cleanup fonksiyonlarını farklı isimler cagirabiliyoruz.
Bunun icin init_module kısmında `__init yeniIsmi`, cleanup kısmında ise `__exit yeniIsim` seklinde bir kullanim yapiyoruz. Ardından bu yeni fonksiyonları
module_init() ve module_exit() ile belirtiyoruz. Ornegin, ilk yazıdaki ornek modulu su sekilde degistirebiliriz.

    #include <linux/module.h> 
    #include <linux/kernel.h> 

    static int __init giriceri(void){
        printk(KERN_INFO "Modul yuklendi.\n");
        return 0;
        /* 0 disinda bir deger donerse
        modul iceri aktarilamadi anlamına gelir. */
    }

    static void __exit cikdisari(void){
        printk(KERN_INFO "Modul bellekten ayrildi. (bek)\n");
    }
    module_init(giriceri);
    module_exit(cikdisari);

Ayrica yazdiginiz modullere yazan, lisans ve ne ise yaradigi gibi nitelikleri de ekleyebiliyorsunuz su sekilde.

    modulkodları
    ....
    ....
      
    MODULE_LICENSE("GPL");
    MODULE_AUTHOR("bek");
    MODULE_DESCRIPTION("Hicbir ise yaramayan bos modul");

Daha fazla ornek icin [buraya](https://git.kernel.org/cgit/linux/kernel/git/torvalds/linux.git/tree/drivers/platform/x86?id=741bf0c7be835d7fdecac5d942e88b5d43958f40) bakabilirsiniz.

Simdi sistem cagrilarina donecek olursak, Sistem Cagrilari kernel space - user space arasindaki baglantinin kurulmasinda yardimci olan fonksiyonlardir. Linux uzerinde gelen sistem cagrilarini gormek icin **/usr/include/bits/syscall.h** dosyasına bakabiliriz.

    bek@rz$ cat /usr/include/bits/syscall.h | head -20
    ...
    ...
    #if !defined __x86_64__
    #define SYS__llseek __NR__llseek
    #define SYS__newselect __NR__newselect
    #define SYS__sysctl __NR__sysctl
    #define SYS_access __NR_access
    #define SYS_acct __NR_acct
    #define SYS_add_key __NR_add_key
    #define SYS_adjtimex __NR_adjtimex
    #define SYS_afs_syscall __NR_afs_syscall
    #define SYS_alarm __NR_alarm
    #define SYS_bdflush __NR_bdflush
    #define SYS_break __NR_break
    #define SYS_brk __NR_brk
    ...
    ...
    bek@rz$ wc -l /usr/include/bits/syscall.h
    974 //3.7.9 surumunde 974 satir sistem cagrisi var. (yaklaşık)

Burda sembolik baglantiyi gostermek icin .../bits/syscall.h'ı gosterdim, programlarda ise ../sys/syscall.h dosyasını include ediyoruz.
Bu dosya da iki tane header dosyasını include ederek sistemin 64 ve ya 32 bit olması gore gereken unistd dosyasını include ediyor.
Burda gordugunuz gibi sistem cagrilari `__NR_` `SYS_`'ye de sembolik olarak bagli, yani iki sekilde de cagirabiliyor. Ayrıca bu sistem çagrilari icin kullanilan bazi sayisal degerler var, bu degerler ile de sistem
cagrisi yapabiliyoruz. Ornegin 32 bit sistemlerde `/usr/include/asm/unistd_32.h` dosyasında 64 bit sistemlerde ise
`/usr/include/asm/unistd_64.h` dosyasinda bu cagrilara verilen numaralari gorebilirsiniz. Ornegin getuid()
sistem fonksiyonunun numarasi `cat /usr/include/asm/unistd_32.h | grep getuid` yaptigimizde `102`
olarak geliyor bizlere. Simdi ornek bir kullanimin nasil oldugunu gostereyim.

    #include <linux/unistd.h>
    #include <sys/syscall.h>

    #define __NR_getuid	102 


    int main()
    {
      int idkac; //getuid int tipinde deger donduruyor.

      idkac = syscall( __NR_getuid ); // __NR_ yerine SYS_ veya 102 de yazılabilir. orn : syscall(102);

      printf("UID degeriniz : %d\n", idkac);

      return 0;
    }

Programı normal olarak derleyip calistirdiginizda sistemdeki uid degerinizi gosterecektir. Ayrıca her seferinde syscall(); fonksiyonunu kullanmak zorunda degilsiniz,
yine makroları kullanarak bu cagrilari da degistirebiliriz. Su sekilde bir kalip ile tum cagrilar icin makro yazabilirsiniz.


    _syscallFONK_NO( pid-turu, fonk_adi )
    _sycall0(pid_t, getuid)


Yani su sekilde bir kod yapimiz olmasi gerekiyor.

    #include <linux/unistd.h>
    #include <sys/syscall.h>

    #define __NR_getuid	102

    _syscall0( pid_t, getuid); //pid_t degeri (int) islem no tutuyor.

    int main()
    {
      int idkac;

      idkac = getuid(); // syscall(SYS_getuid); degilde direkt fonk. olacak.

      printf("UID degeriniz : %d\n", idkac);

      return 0;
    }

Daha fazla fonksiyon eklemek icin, _syscall0 yerine _syscall1 ve artarak devam edebilirsiniz.
