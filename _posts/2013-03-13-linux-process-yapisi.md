---
layout: post
title: Linux Process Yapısı
---

Merhabalar, yine Linux kernel'de bulunan *Process* yapısından bahsetmek istiyorum biraz. Process yani işlemleri listeleyebilmek için `ps` isimli komutu kullanıyoruz, zaten kendisinin açılımı `process status`'dur. Ornegin `ps -e` yardımı ile aktif olan tum islemleri gorebliirsiniz. Listeye baktıgınızda her isleme verilen bir *PID* degeri vardır, bu deger pozitif bir tamsayı alır. Ayrıca bu numara o an icin tekdir, yani o islem var oldugu surece o *PID* degeri ile baska bir islem calistirilamaz. `ps -e` ciktisina baktiginizda **1** numarali *PID* degerine sahip olan islem *init*'dir, kendisini [buradan](http://lxr.free-electrons.com/source/init/main.c) gorebilirsiniz. Linux uzerinde *PID* degeri dedigimiz islem numarasını tutan `pid_t` isimli `int` deger alan bir degisken tipi vardir. Ornegin calisan programin *PID* degerini donen `getpid()` fonksiyonunun prototipi şöyledir,

    pid_t getpid(void)

Simdi onceki post'daki uid degerini veren programı biraz degistirip soyle birsey yapalim.

    #include <linux/unistd.h>
    #include <sys/syscall.h>
    #include <sys/types.h> 

    #define __NR_getpid 39 // ../include/asm/unistd_bitDegeri.h | grep getpid

    int main()
    {
      pid_t pidkac; 
      pidkac = syscall(39); 

      printf("PID degeriniz : %d\n", pidkac);

      return 0;
    }

Programı derleyip calistirdiginizda programınıza ait pid degerini ogrenebilir, ayrıca surekli yeniden acarak pid degerinin ardasik olarak arttıgınıda gorebilirsiniz. Tabi her zaman boyle olmaz arada baska islemlerde olabilir. Simdi process olusturma kismina gelirsek. Process olusturmak icin `fork()` fonksiyonunu kullanıyoruz, kendisi tabiki `pid_t` tipinde deger donduruyor. fork ile bir islem olusturdugunuzda iki ayrı benzer islem meydana gelecek, linux dunyasinda bunlardan pid degeri 0 olana genellikle cocuk, sifirdan farklı pozitif bir deger olana ise anne process denilir. Yazılan programlarda cogunlukla bu iki degerin kontrolu yapılır ve ona gore islemler gerceklestirilir yani soyle,

    islem = fork()
    if(islem == 0)
        Cocuk icin islemler
    Anne icin islemler

Simdi soyle birsey yazdıgımizi dusunelim.

    #include <unistd.h>
    #include <sys/types.h>
    #include <stdio.h>

    int main()
    {

        pid_t islem;
        int i;

        islem = fork();
        printf("%d\n",islem );

        if (islem == 0){
            for (i = 0; i  < 3; i++){
            	printf("BEN COCUK ISLEMIM\n");
            }
        return 0;
       }

        for (i = 0; i < 3; i++){
        	printf("BEN ANNE ISLEMIM\n");
        }

        return 0;
    }

Programı derleyip calistirdiginizda suna benzer bir cikti almaniz gerek.

    bek@rz$./a.out 
    1880
    BEN ANNE ISLEMIM
    BEN ANNE ISLEMIM
    BEN ANNE ISLEMIM
    0
    BEN COCUK ISLEMIM
    BEN COCUK ISLEMIM
    BEN COCUK ISLEMIM
    bek@rz$ 

pid degerleri muhtelen farkli olacak tabi, simdi soyle dusunsek, diyelim ki biz cocuk islemde yaptiracagimiz islemleri anne islemden once yaptirmak istiyoruz o zaman ne olacak ? İste o zaman da `waitpid` fonksiyonumuz devreye girecek, isminden de anlasilabilecegi gibi bu fonksiyon baska bir islemin sonlanmasini beklememizi sagliyor. Prototipi su sekilde.

    waitpid(pid_t pidDegeri, int *cocukSonuc, int AYARLAR)

Buradaki **pidDegeri** bekledigimiz islemin *pid* degeri, **cocukSonuc** ise cocuk islemin sonucunun saklandigi bir *pointer*, her zaman tanımlayacagiz diye bir sey yok tanımlamak istemedigimiz zaman `NULL` degerini kullanacagiz, son olarak AYARLAR'da anlayabileceginiz gibi ekstra ayarlar kısmı.

Simdi anne islemin cocuk islemi bekledigi bir ornek yapalim boylece daha kolay anlasilabilir.

    #include <unistd.h>
    #include <sys/types.h>
    #include <stdio.h>

    int cocuk(){
        int j;
    	for(j=0; j<3; j++)
    		printf("[+] Selam ben cocuk islem !\n");
    }

    int main()
    {
        pid_t islem;

        islem = fork();
        printf("[+] PID : %d\n",islem ); // Islem numarasini gorelim.

        if (islem == 0){
        	cocuk();
        return 0;
       }

        printf("[+] Anne, cocuk icin bekliyor.\n\n");
        waitpid(islem,NULL,NULL); //NULL yerine 0(sıfır) da olur.
        printf("\n[!] Cocuk sonlandi, Anne sonlaniyor.\n");

        return 0;
    }

Kodumuzu derleyip calistirdiktan sonra alacagimiz cikti bir hata yok ise suna benzer olacaktir.

    bek@rz$ ./a.out 
    [+] PID : 2153
    [+] Anne, cocuk icin bekliyor.

    [+] PID : 0
    [+] Selam ben cocuk islem !
    [+] Selam ben cocuk islem !
    [+] Selam ben cocuk islem !

    [!] Cocuk sonlandi, Anne sonlaniyor.


Ayrıca unutmadan, fork islemi basarısız da olabilir tabi, bu durumda negatif bir deger verecektir, iyi calisan bir uygulama icin programınıza pid degerinin **negatif** olma ihtimali de kontrol edin. Bu programı biraz daha degistirip bu defa islemlerin **id** numaralarını almak istersek iki yeni fonksiyon daha katacagız, bunlar `getpid` ve `getppid` ilk fonksiyon **Çocuğun** *ID* degerini, ikinci ise **Annenin** *ID* degerini veriyor. Duzenlenmis yeni kodlar su sekilde.

    #include <unistd.h>
    #include <sys/types.h>
    #include <stdio.h>

    int cocuk(){
        int j,cocukid;
        cocukid = getpid();
    	for(j=0; j<3; j++)
    		printf("[+] Selam ben cocuk islem ! ID : %d\n",cocukid);
    }

    int main()
    {
        pid_t islem;
        int anneid;

        islem = fork();
        if (islem == 0){
        	cocuk();
        return 0;
       }

        printf("[+] Anne, cocuk icin bekliyor.\n\n");
        waitpid(islem,NULL,NULL); //NULL yerine 0(sıfır) da olur.
        anneid = getppid();
        printf("\n[!] Cocuk sonlandi, Anne sonlaniyor. ID : %d \n", anneid);

        return 0;
    }

Herhangi bir hata olmazsa bunun ciktisida suna benzer birsey olmalı sizde, *ID* degerleri farklı olacak buyuk ihtimal.

    bek@rz$ ./a.out 
    [+] Anne, cocuk icin bekliyor.

    [+] Selam ben cocuk islem ! ID : 2674
    [+] Selam ben cocuk islem ! ID : 2674
    [+] Selam ben cocuk islem ! ID : 2674

    [!] Cocuk sonlandi, Anne sonlaniyor. ID : 2626 

Son olarak, *PID* ile *ID* degerinin farklı oldugunu gormek istiyorsanız soyle bir degisiklik yapin.

    ...
    ...
    islem = fork();
    printf("PID : %d\n",islem);
    ...
    ...
