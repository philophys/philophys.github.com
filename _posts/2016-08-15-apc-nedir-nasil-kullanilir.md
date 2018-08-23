---
title: APC nedir? Nasıl kullanılır?
---

Selamlar

Bu yazıyı çaylıkların üzerinde uzanarak yazıyorum, karşımda iki dağın arasından akan bir dere var, biraz daha uzağında ise döküldüğü denizi görüyorum. Ordan bakılınca "*ooo keyfin yerinde*" diyorsanız demek ki hiç çaylıkta oturmadınız demektir hehe. Neyse, konuya geçelim. Bu yazıda Windows işletim sistemindeki APC'lerden bahsetmeye çalışıcam. Kendime not da olsun diye yazdığım için biraz kopuk bir yazı olabilir kusura bakmayınız..

## Eşzamanlı Olmayan İşlem Çağrısı (Asynchronous Procedure Call - APC) nedir?
**APC**ler sistem ve kullanıcı kodlarının belirli bir işlemciğin bağlam alanında(context) çalıştırılabilmesine (ve böylelikle başka bir işlemin sanal adres alanında) olanak veren bir mekanizmadır. İşletim sisteminde bir APC, işlemciklerden birinde çalışmak üzere eklendiğinde işletim sistemi **APC_LEVEL** IRQL seviyesinde bir yazılım kesmesi çalıştırır. Akabinde işlemcik kendisinde çalışmak için bekleyen **APC**ler çalışana dek aradan çekilir. APCler çalıştıktan sonra işlemcik tekrar çalışmaya devam eder. **APC**ler işlemciklerde çalışmak üzere eklendiğinden anlaşılabileceği üzere sistemdeki her işlemciğin yapısında kendisinde çalışacak APCler hakkında bilgi de tutulmaktadır. 

**APC**ler *DPC/DISPATCH_LEVEL* seviyesinden düşük bir seviyede çalıştıkları için **DPC**'lerden daha fazla işlem yapabilme kabiliyetine sahiptirler. Oysa **DPC**ler için bazı kısıtlamalar mevcuttur, bunlara DPC konusundan bahsedersek değinicem inşallah. **APC**ler için ise bu kısıtlamalar yoktur, şunları diyebiliriz, mesela nesneler üzerinde bekleme yapabilirler, sayfa hatası(page fault) gerçekleştirebilirler veya sistem çağrıları yapabilirler. 

Bundan önceki yazıda `nt!_KAPC` yapısından bahsederken işlemcikte çalışacak olan APClerin `KTHREAD.ApcState.ApcListHead[]` alanında bulunan iki dizide çekirdek ve kullanıcı modu **APC**lerinin tutulduğundan bahsetmiştik. Bu iki farklı **APC** çeşidinin farkı kullanıcı modu **APC**leri işlemcikte çalışmak için işlemcikten alınacak izne ihtiyaç duyar, fakat çekirdek modu **APC**lerin bu izne gerek duymadan direkt işlemciğin çalışmasını duraklatıp çalışabilirler. **ApcState** alanı ise literatürde *APC ortamı*(APC Environment) olarak adlandırılır. Burada **KernelApcPending**, **KernelApcInProgress**, **UserApcPending** gibi **APC**lerin işlenip işlenmediği, beklemede olup olmadığı, ve eklendiği işlemi gösteren **Process** alanı gibi bilgiler bulunur.

**ApcState** dışında bir de **SavedApcState** alanı bulunmaktadır. Bu ise işlemciğin başka bir işleme eklenmesi sırasında kendine ait APC ortam bilgisini yedeklemesi için kullanılır(Bunu yapan fonksiyon *KiMoveApcState()*). Sanırım önceki yazıda bundan biraz bahsetmiştik?? Şunu ekleyelim o zaman, misal *KeAttachProcess()* fonksiyonunu çalışması sırasında bu alan devreye girer. **ApcState** alanı **SavedApcState** alanına kopyalanır. Ardından **ApcState** alanı temizlenip yeniden kullanılabilir hale getirilir. Başka bir işlemin bağlam alanında olduğu sürece işlemcik buradaki yeni APC ortamını kullanır, *KeDetachProcess()* fonksiyonu çalıştığında ise eski APC ortam bilgisi tekrar yerine koyulur. Bu sayede işlemcik hem kendi bağlam alanında, hem de başka işlemin bağlam alanında APC işleyebilir. Ayrıntılar için bahsi geçen iki fonksiyonu incelemenizi tavsiye ederim..

Çekirdek modu APCleri de kendi aralarında *normal* ve *özel* olarak ikiye ayrılmaktadır. Bunların farkı ise *özel* APClerin **APC_LEVEL** seviyesinde çalışıp, APC parametrelerinin bazılarını değiştirebilme yetkisine sahip olmalarıdır. Normal çekirdek APCleri ise **PASSIVE_LEVEL** seviyesinde çalışırlar ve kendi parametrelerini değiştiremezler. Bunun dışında bazı farklılıklar da vardır, örneğin *özel çekirdek APCleri* işlemciğin APC listesine eklenirken direkt olarak **en üst** sıraya eklenirler. *Normal çekirdek APCleri* ise en son özel çekirdek APCsinden hemen sonraya eklenirler(Yani normal çekirdek APClerinin en başına).

Normal ve çekirdek modu APClerin çalışması IRQL seviyesini **APC_LEVEL**'e çıkartılarak durdurulabilir(Mesela **FastMutex** ve **GuardedMutex**'ler bundan yararlanırlar, onları da anlatırım bir ara inşallah hehe). Veya bunun yerine işlemciğin yapısında önceki yazıda bahsettiğimiz **SpecialApcDisable** ve **KernelApcDisable** alanları negatif bir değere atanarak da durdurulabilir. Örneğin sistemde bulunan *KeEnterGuardedRegion()* fonksiyonu işlemciğin yapısında bulunan `KTHREAD.KernelApcDisable` alanını negatif bir değere atayıp, işlemciğin *hangi tipte olursa olsun* APC almasını engellemektedir. Bu da bu fonksiyonun ne amaçlarla kullanılabileceğine ışık tutuyor tabi.. Aşağıda fonksiyonun ne yaptığını görebilirsiniz:

```c
VOID
KeEnterGuardedRegionThread (
    IN PKTHREAD Thread
    )
{
    ...
    ...
    Thread->SpecialApcDisable -= 1;  // Her türlü APC işlenmesi itinayla engellendi
    ...
    ...
    return;
}
```

Ayrıca bir de *KeEnterCriticalRegion()* fonksiyonu ile işlemciğin *normal çekirdek APClerini* alması engellenebilir. Tahmin edebileceğiniz üzre bu fonksiyon da işlemciğin yapısındaki `KTHREAD.KernelApcDisable` alanını negatif bir değere düşürmektedir.

```c
VOID
KeEnterCriticalRegionThread (
    PKTHREAD Thread
    )
{
    ...
    ...
    Thread->KernelApcDisable -= 1; // Normal çekirdek modu APC işlenmesi engellendi
    ....
    return;
}
```

Bu arada **KTHREAD** yapısında APC durumları ile ilgili bilgi veren alanlar şu şekilde görülebilir:

```c
union
{
    struct
    {
        SHORT KernelApcDisable;   // Normal çekirdek APCleri durumu
        SHORT SpecialApcDisable;  // Özel çekirdek APCleri durumu
    };
    ULONG CombinedApcDisable;
};
```

Birlik olarak tanımlandığı için **CombinedApcDisable** alanının hem normal hem de özel çekirdek APCleri işlev dışı mı diye öğrenmek için kullanılabilir görüldüğü üzre..

APCler bir işlemin, belli bir işlemciğin (ve doğal olarak işlemin ) sanal adres alanında yapılması gerektiği durumlarda kullanılırlar diyebiliriz. Örneğin bir işlemciğin duraklatılması(suspend) veya devam ettirilmesi(resume) sırasında, işlemciğin bağlam alanı(thread context) yapısı alınıp tekrar tanımlandığında, veya bir DLL enjeksiyonu yapılması, bir işlemin sanal adres alanında başka bir işlemcik çalıştırmak istendiğinde APCler kullanılabilir. Bunun dışında G/Ç işlemlerinde IRP'lerin işlenmesinde de kullanılırlar.

Örneğin *ReadFileEx*, *WriteFileEx* fonksiyonları eşzamanlı olmayan G/Ç işlemleri yaparken kullanıcıya bir "tamamlama rutini" belirleme özelliği sunarlar. Bu tamamlama rutini G/Ç işlemi bittikten sonra G/Ç yöneticisi tarafından bir kullanıcı modu APCsi kullanılarak çalıştırılır. Tabi bu çalışma hemen olmayabilir lakin kullanıcı modu APClerinin çalışabilmesi için işlemciğin "*alertable wait*" durumunda olması gerekmektedir. Bu duruma gelmek için işlemcik *SleepEx()*, *SignalObjectAndWait()*, *MsgWaitForMultipleObjectsEx()*, *WaitForMultipleObjectsEx()*, veya *WaitForSingleObjectEx()* gibi fonksiyonlar kullanılabilir.  

Biraz daha psikopatlaşmak isterseniz şunları da ekleyeyim. İşletim sistemindeki bir çok mekanizma sistemin tamamına yayılmış durumdadır. Yani mesela IRQL seviyesinin **APC_LEVEL** çıkması/düşmesi sistemin bir çok yerinde olabileceği gibi programcı tarafından da yapılabilir. Mesela az önceki fonksiyonun zıttı işlemi yapan *KeLeaveGuardedRegion()* bakalım bi.

```c
VOID
KeLeaveGuardedRegionThread (
    IN PKTHREAD Thread
    )
{
    ...
    ...
    if ((Thread->SpecialApcDisable += 1) == 0) { 
        if (Thread->ApcState.ApcListHead[KernelMode].Flink != &Thread->ApcState.ApcListHead[KernelMode]) {
            KiCheckForKernelApcDelivery();
        }                                                             
    }                                                                 
    return;
}
```

Görüldüğü üzere burda işlemciğin yapısındaki **SpecialApcDisable** alanı tekrar arttırılarak sıfır mı diye kontrol ediliyor. Ardından çekirdek modu APC listesi kontrol ediliyor içerde bekleyen APC var mı diye. Eğer var ise *KiCheckForKernelApcDelivery()* fonksiyonu çağırılıyor. Bu fonksiyonu incelediğimizde IRQL seviyesinin **APC_LEVEL**'e çıkartılıp *KiDeliverApc()* fonksiyonu çağırıldığını görüyoruz. Hmm, demek ki APCleri işleyen fonksiyon bu. Bu fonksiyonun çağırılma yerlerine baktığımızda karşımıza birçok yer çıkıyor. Mesela APC kesmesi olan *KiApcInterrupt()* sırasında, işlemciklerin duraklatılması sırasında(*KiSuspendThread()*) vs vs. Şunu diyebiliriz ki, bu fonkiyon ya APC kesmesi oluştuğunda ya da çeşitli yerlerde kontrolü yapılan "*APC beklemede*" bayraklarının aktif olması durumunda çalıştırılmaktadır. Bahsi geçen bayraklar için `KTHREAD.ApcState` alanında bulunan APC ortamına bakabiliriz:

```c
typedef struct _KAPC_STATE
{
     LIST_ENTRY ApcListHead[2];  // Çekirdek ve kullanıcı modu APCleri için ayrı 2 liste
     PKPROCESS Process;          // APCnin hedefi olan işlemin nesnesi
     UCHAR KernelApcInProgress;  // Şu anda bir çekirdek modu APCsi işleniyor bayrağı
     UCHAR KernelApcPending;     // Çekirdek modu APCsi işlenmeyi bekliyor bayrağı
     UCHAR UserApcPending;       // Kullanıcı modu APCsi işlenmeyi bekliyor bayrağı
} KAPC_STATE, *PKAPC_STATE;
```

Neticede *KiDeliverApc()* çalıştığı için bu fonksiyona kısaca bir göz atmakta fayda var. Fakat öncelikle `KAPC` yapısını tekrar görsek çok daha yerinde olur lakin bu fonksiyon neticede bu yapılarla uğraşacak, görünen köy, .... uzakta değildir :P

Fonksiyonda birtakım işlemler(hehe uzatmayayım) yapıldıktan sonra öncelikle özel çekirdek APCleri işlenebilir durumda mı kontrol ediliyor, ardından özel APClerin işlenmesi başlıyor. Devamında normal çekirdek APCleri ve son olarak kullanıcı modu APCleri işleniyor.

```c
...
...
Thread = KeGetCurrentThread();             // Mevcut işlemcik nesnesini al
if (Thread->SpecialApcDisable == 0) {      // Özel çekirdek APCleri işleyebilir durumda mıyız?
    // Hmm, çekirdek APC listesi boş olmadığı sürece işle bakalım 
    while (IsListEmpty(&Thread->ApcState.ApcListHead[KernelMode]) == FALSE) { 

        //
        // (Hâlâ) Boş değilll. O zaman IRQL'yi DISPATCHER_LEVEL seviyesine çıkarıp 
        // APC listesini kitleyelim, ve işleyebileceğimiz bir çekirdek modu 
        // APC var mı bakalım.
        //
        // Eğer bu liste boş ise, aşağıda kullanıcı modu APClerini işleyeceğiz
        //

        KeAcquireInStackQueuedSpinLock(&Thread->ApcQueueLock, &LockHandle); // APC listesini kilitle
        NextEntry = Thread->ApcState.ApcListHead[KernelMode].Flink;         // Listeden girdi al
        if (NextEntry == &Thread->ApcState.ApcListHead[KernelMode]) {       // sahi girdi var mı?
            KeReleaseInStackQueuedSpinLock(&LockHandle);                    // yok. çık o zaman
            break;
        }

        //
        // Çekirdek APC beklemede bayrağını temizle, APC nesnesini al,
        // ardından tipini belirleyip çalıştır.
        //

        Thread->ApcState.KernelApcPending = FALSE;              // Artık çekirdek APCsi beklemiyor
        Apc = CONTAINING_RECORD(NextEntry, KAPC, ApcListEntry); // KAPC yapısı alınıyor
        ReadForWriteAccess(Apc);
        KernelRoutine = Apc->KernelRoutine;  // Çalışacak olan APC rutinleri KAPC yapısından alınıyor
        NormalRoutine = Apc->NormalRoutine;  // bunların işlevleri için önceki yazıya bakabilirsiniz
        NormalContext = Apc->NormalContext;
        SystemArgument1 = Apc->SystemArgument1;
        SystemArgument2 = Apc->SystemArgument2;
        if (NormalRoutine == (PKNORMAL_ROUTINE)NULL) {  // Normal rutin değeri var mı? Eğer 
                                                        // yoksa demek ki özel çekirdek APCsi
            //
            // Ah, evet yokmuş. Demek ki bu sahiden özel bir çekirdek APCsi.
            // O zaman APC listesinden bu APCyi silelim, APCnin listeye eklendiği
            // bilgisini (Inserted) eklenmedi olarak değiştirip, kilidi açalım 
            // ve APCyi çalıştıralım
            // 

            RemoveEntryList(NextEntry);                  // APC listeden siliniyor
            Apc->Inserted = FALSE;                       // Listeye eklenmiş bilgisini temizleyelim
            KeReleaseInStackQueuedSpinLock(&LockHandle); // Liste kilidini açabiliriz artık
            (KernelRoutine)(Apc,                         // APC çekirdek modu rutini çağrılıyor
                            &NormalRoutine,
                            &NormalContext,
                            &SystemArgument1,
                            &SystemArgument2);


        } else {

            // 
            // Hmm, o zaman listedeki ilk girdi normal çekirdek APCsi.
            // Eğer şu an çalışan başka bir normal çekirdek APCsi yoksa
            // ayrıca çekirdek APCleri devre dışı değilse APCyi listeden 
            // alalım, listeye ekli bilgisini temizleyelim ve APCyi işleyelim
            //

            if ((Thread->ApcState.KernelApcInProgress == FALSE) && // Başka çekirdek APCsi çalışmıyor di mi?
               (Thread->KernelApcDisable == 0)) {       // Peki çekirdek APCsi işleyebilir miyiz?

                RemoveEntryList(NextEntry);                  // Evet, evet. Bu liste girdisini sil,
                Apc->Inserted = FALSE;                       // listeye eklendi bayrağını temizle,
                KeReleaseInStackQueuedSpinLock(&LockHandle); // APC listesi kilidini aç,
                (KernelRoutine)(Apc,                         // APCnin çekirdek rutinini çağır.
                                &NormalRoutine, 
                                &NormalContext,
                                &SystemArgument1,
                                &SystemArgument2);

                if (NormalRoutine != (PKNORMAL_ROUTINE)NULL) {   // Normal rutine sahip miyiz peki?
                    Thread->ApcState.KernelApcInProgress = TRUE; // hee, çekirdek APCsi işlenmekte bayrağını kaldır,
                    KeLowerIrql(0);                  // IRQL'yi PASSIVE_LEVEL'e al 
                    (NormalRoutine)(NormalContext,   // ve normal rutini çağır.
                                    SystemArgument1,
                                    SystemArgument2);

                    KeRaiseIrql(APC_LEVEL, &LockHandle.OldIrql); // Tekrar APC_LEVEL seviyesine gel
                }

                Thread->ApcState.KernelApcInProgress = FALSE;  // Çekirdek APCsi işlendi, artık 
                                                               // işleniyor bayrağını temizleyebiliriz

            } else { 
                // Başka bir çekirdek APCsi çalışıyor, veya çekirdek APCleri devre dışı... 
                // APC listesinin kilidini aç ve bi kontrol yap bakalım.
                KeReleaseInStackQueuedSpinLock(&LockHandle);
                goto CheckProcess;
            }
        }
    }

    //
    // Hmm, çekirdek APC listesi boş çıktı. O halde bak bakalım
    // önceki mod değeri kullanıcı modu mu, kullanıcı modu APCsi 
    // beklemede bayrağı aktif mi ve kullanıcı modu APC listesi boş mu? 
    // Eğer öyleyse APC listesinden ilk APCyi al, APCnin listeye eklendi
    // bayrağını HAYIR olarak güncelle, kullanıcı APCsi bekliyor bayrağını
    // temizle, ve verilen çekirdek rutinini çalıştır.
    // Eğer çekirden rutininden döndüğünde normal rutin adresi varsa,
    // kullanıcı modu APC bağlam alanını hazırla ve geri dön.(return)
    // Tersi durumda ise başka bir kullanıcı modu APCsi işlenebilir mi onu kontrol et.
    //

    if ((PreviousMode == UserMode) &&                                  // Önceki mod kullanıcı mı,
        (IsListEmpty(&Thread->ApcState.ApcListHead[UserMode]) == FALSE) && // APC listesinde bişiy var mı,
        (Thread->ApcState.UserApcPending != FALSE)) {    // ve kullanıcı mod APCsi beklemiyor di mi?

        //
        // Evet öyle, o zaman IRQL'yi yükselt, APC listesini kilitle 
        // ve APCyi işle. 
        //

        KeAcquireInStackQueuedSpinLock(&Thread->ApcQueueLock, &LockHandle);

        Thread->ApcState.UserApcPending = FALSE;                    // Artık kullanıcı APCleri beklemiyor, 
        NextEntry = Thread->ApcState.ApcListHead[UserMode].Flink;   // listeden girdi al,
        if (NextEntry == &Thread->ApcState.ApcListHead[UserMode]) { // sahi listede girdi var mı?
            KeReleaseInStackQueuedSpinLock(&LockHandle);            // Yok, bi sıkıntı var. 
            goto CheckProcess;                                      // kilidi aç ve kontrol et
        }

        Apc = CONTAINING_RECORD(NextEntry, KAPC, ApcListEntry); // Girdi var, o zaman KAPC yapısını al
        ReadForWriteAccess(Apc);                                
        KernelRoutine = Apc->KernelRoutine;         // Gerekli olan rutinleri KAPC yapısından al
        NormalRoutine = Apc->NormalRoutine;
        NormalContext = Apc->NormalContext;
        SystemArgument1 = Apc->SystemArgument1;
        SystemArgument2 = Apc->SystemArgument2;
        RemoveEntryList(NextEntry);                          // Bu APCyi listeden sil
        Apc->Inserted = FALSE;                               // Listede değil diye işaretle
        KeReleaseInStackQueuedSpinLock(&LockHandle);         // APC listesinin kilidini aç
        (KernelRoutine)(Apc,                                 // Önce çekirdekde çalışacak rutini çalıştır
                        &NormalRoutine,
                        &NormalContext,
                        &SystemArgument1,
                        &SystemArgument2);

        if (NormalRoutine == (PKNORMAL_ROUTINE)NULL) {   // Peki şu an bir normal rutine sahip miyiz?
            KeTestAlertThread(UserMode);                 // hayır değiliz. O zaman bak bi başka kullanıcı
                                                         // modu APC işleyebilir miyiz..
        } else {
            KiInitializeUserApc(ExceptionFrame,          // Normal rutin var, demek ki kullanıcı
                                TrapFrame,               // modunda bişeyler çalışcak. Onu işle.
                                NormalRoutine,
                                NormalContext,
                                SystemArgument1,
                                SystemArgument2);
        }
    }
}
...
...
```

Bunun dışında incelenmesi faydalı olarak düşündüğüm *KiInitializeUserApc()*, *KeInitializeApc()* , *KeInsertQueueApc()*, *KiInsertQueueApc()*, *KeRemoveQueueApc()* gibi fonksiyonlar da var. Eğer deliyseniz yapıyı anlamak için bunlara da bakabilirsiniz. Fakat günlük olarak APC kullanacaksanız muhtemelen bunlara gerek yok diye değerlendiyorum.. 

## APCleri çekirdek modunda nasıl kullanabiliriz?

APCleri kullanabilmek için önce sürücümüzde **APC** nesnemizi tanımlayacak bir **KAPC** yapısı tanımlamamız gerekiyor. Ardından bu yapı için alan ayırmalı, ve APC göndereceğimiz işlemciğin nesnesine (**KTHREAD**) sahip olmamız gerekiyor. Elimizdeki bu bilgileri *KeInitializeApc()* fonksiyonuna vererek öncelikle APC nesnemizi tanımlamış oluyoruz. Fonksiyonun prototipi şöyle:

```c
VOID
KeInitializeApc (
    __out PRKAPC Apc,
    __in PRKTHREAD Thread,
    __in KAPC_ENVIRONMENT Environment,
    __in PKKERNEL_ROUTINE KernelRoutine,
    __in_opt PKRUNDOWN_ROUTINE RundownRoutine,
    __in_opt PKNORMAL_ROUTINE NormalRoutine,
    __in_opt KPROCESSOR_MODE ApcMode,
    __in_opt PVOID NormalContext
    );
```

Yani başlangıçta aşağı yukarı şöyle bir şey yapmamız gerekiyor diyebiliriz.

```c
PKTHREAD thread;     // Hedeflediğimiz işlemciğin nesnesine gösterici
PKAPC    Apc;        // APC nesnemize gösterici

//
// Burası çok çok önemli. Burada aldığımız işlemcik nesnesi
// APC yollamak istediğimiz işlemcik olmalı. Bunu garanti etmenin 
// çeşitli yolları var. Şunu unutmayın ki bu örneğe göre, buradaki 
// kodlar çalışırken o işlemciğin bağlam alanında olmanız gerekiyor, 
// mesela ben burda bildirim rutinlerinde çalıştırdığım için istediğim
// işlemciğin bağlam alanında olduğuma emin olabiliyorum siz de bu veya 
// diğer yöntemleri kullanarak hedef işlemciğinizin nesnesine gösterici almalısınız
// 
thread = KeGetCurrentThread(); 

Apc = (PKAPC) ExAllocatePoolWithTag(NonPagedPool,     // APC nesnemiz için hafıza alanı alalım
                                    sizeof(KAPC),
                                    BEK_MALW_TAG);

if (!Apc)
{
    LOG("Apc yapısı için alan ayıramıyorum :((");
    return FALSE;
}

//
// Alan ayırabildik, o halde APC nesnemizi işlemciğin listesine göndermek için hazırlayalım 
//
KeInitializeApc(Apc,                   // APC nesnemiz
                thread,                // Hedef işlemcik
                OriginalApcEnvironment,// Hangi Apc ortamı alanını kullanıcaz?
                &KernelApcRoutine,     // Çekirdekte çalışacak olan rutinimiz
                NULL,                  // Rundown rutini, APC listesinin boş verileceği durumunda çalışacak rutin
                &NormalRutinim,        // Bu da işlemcik içinde çalışacak olan rutinimiz
                UserMode,              // Kullanıcı modunu hedefliyoruz
                Context);              // APC rutinimize parametre olarak gidecek
```

Peki *KeInitializeApc()* fonksiyonu ne yapar? Dediğimiz gibi APC nesnesini ilk kullanılacak konumuna hazır hale getirir. `KAPC` yapısını görelim ardından fonksiyon ile ilgili bir iki not da ekleyelim.

```
kd> dt _KAPC
ntdll!_KAPC
   +0x000 Type             : UChar
   +0x001 SpareByte0       : UChar
   +0x002 Size             : UChar
   +0x003 SpareByte1       : UChar
   +0x004 SpareLong0       : Uint4B
   +0x008 Thread           : Ptr32 _KTHREAD
   +0x00c ApcListEntry     : _LIST_ENTRY
   +0x014 KernelRoutine    : Ptr32     void 
   +0x018 RundownRoutine   : Ptr32     void 
   +0x01c NormalRoutine    : Ptr32     void 
   +0x020 NormalContext    : Ptr32 Void
   +0x024 SystemArgument1  : Ptr32 Void
   +0x028 SystemArgument2  : Ptr32 Void
   +0x02c ApcStateIndex    : Char
   +0x02d ApcMode          : Char
   +0x02e Inserted         : UChar
```

Fonksiyonumuz içerisinde yer alan kodlar aşağı yukarı aşağıdaki gibi, satırların yanlarına koyduğum notlar umarım yeterince açıklayıcı olmuştur.

```c
{
    //
    // Öncelikle yapıdaki ilk iki alanı ayarlıyoruz
    // Biri nesne tipini diğeri de boyutunu veriyor
    //
    Apc->Type = ApcObject;
    Apc->Size = sizeof(KAPC);

    if (Environment == CurrentApcEnvironment) {     // Mevcut olan APC ortamı mı kullanıcak?
        Apc->ApcStateIndex = Thread->ApcStateIndex; // Evet, o zaman mevcut KAPC_STATE'yi gösteren 
                                                    // ApcStateIndex değerini kullan, bu değer bize 
                                                    // KTHREAD.ApcStatePointer[] gösterici dizisiyle
                                                    // asıl KTHREAD.ApcState alanını verecek

    } else { 
        //
        // Hmm, şu an kullanımda olanı değil başka bir taneyi istiyor
        //
        Apc->ApcStateIndex = (CCHAR)Environment;
    }

    Apc->Thread = Thread;                   // Hedef işlemcik
    Apc->KernelRoutine = KernelRoutine;     // Çekirdekte çalışacak rutin
    Apc->RundownRoutine = RundownRoutine;   // APCler boş verildiğinde çalışacak rutin(örn: işlem sonlanırken)
    Apc->NormalRoutine = NormalRoutine;     // İşlemcikte çalışacak olan rutin
    
    if (ARGUMENT_PRESENT(NormalRoutine)) {  // Bak bakalım normal rutini var mı?
        Apc->ApcMode = ApcMode;             // Evet, var o zaman argüman olarak gelen modu kullan 
        Apc->NormalContext = NormalContext; // NormalRoutine&KernelRoutine'e gidecek olan NormalContext'i ayarla

    } else {                                // Ah, hayır NormalRoutine yok, hmm bu bir kernel APCsi
        Apc->ApcMode = KernelMode;          // O zaman ApcMode ne diyo boşver, direkt KernelMode yap modu
        Apc->NormalContext = NULL;          // Eh, normal rutin yoksa bu da NULL olcak demektir
    }

    Apc->Inserted = FALSE;                  // APC henüz işlemciğin APC listesine eklenmedi, onu da belirtelim
    return;
}
```

APC nesnemizi tanımladıktan sonra yapmamız gereken şey bu APC'yi hedef işlemciğin APC listesine eklemek. Bunu yapmak için ise *KeInsertQueueApc()* isimli fonksiyon bize yardımcı oluyor. Bu fonksiyon az önce hazırladığımız APC nesnesini, 2 adet belirleyebildiğimiz argümanı ve bir de öncelik yükseltmek için bir değer alıyor. Genelde bu son 3 değer pek verilmiyor günlük(hehe) kullanımda. Tabi ihtiyacınıza kalmış.. Bu bahsi geçen argümanlar ise direkt olarak APCnin rutinlerine gönderiliyorlar.. Rutinlerin prototiplerine bakmayı unutmayın bu arada tabii. Fonksiyon prototipi şöyle:

```c
BOOLEAN
KeInsertQueueApc (
    __inout PRKAPC Apc,
    __in_opt PVOID SystemArgument1,
    __in_opt PVOID SystemArgument2,
    __in KPRIORITY Increment
    );
```

Örneğin yukarıdaki kodun devamı olarak şöyle bir şeyle devam edebiliriz:

```c
//
// APC yapımız hazır olduğuna göre artık APC'yi gönderebiliriz
//
if (!KeInsertQueueApc(Apc, NULL, NULL, 0))
{
    LOG("Queue KAPC başarısız oldu ya :((");
    ExFreePoolWithTag(Apc, BEK_MALW_TAG);      // Ayırdığımız alanı bırakmayı unutmayalım tabi.
    return FALSE;
}
```

Peki *KeInsertQueueApc()* fonksiyonu ne yapıyor derseniz onu da biraz açıklayalım (Not: Normalde bu kadar ayrıntıya tabi ki gerek yok, fakat ben APClerin hem kullanımını, hem yapısını anlatmak istediğim için bu kadar deşiyorum).

Öncelikle `KTHREAD.ApcQueueable` bayrağını kontrol edip, işlemciğe APC yollanabilir mi onu kontrol ediyor. Eğer yollanabiliyorsa APC nesnesinin **Inserted** alanını **TRUE** yapıyor, yani "*evet hacı, bu APC şu an işlemciğin listesinde*" diyor. Ardından APC nesnesinin **SystemArgument1** ve **SystemArgument2** alanlarına direkt olarak kendisine verilen değeri atıyor. Sonrasında ise asıl işlemi yapacak olan *KiInsertQueueApc()* fonksiyonunu çağırıyor.

Bu yeni çağırılan fonksiyon ise söz konusu APC nesnesini ve öncelik arttırma değerini alır ardından öncelikle işlemciğin APC listesini kilitler. Ardından **ApcStateIndex** değerini kullanarak APCnin ekleneceği asıl APC alanını(environment) belirler. Akabinde ise yukarıda anlattığımız üzre APCnin tipine göre mesela APC nesnesindeki `KAPC.ApcMode` alanına bakarak işlemcik nesnesinde kullanıcı mı yoksa çekirdek moduna mı APC gönderildiğine göre bir liste seçer (`KTHREAD.ApcState.ApcListHead[]`) ve APCyi işlemciğin nesnesinde belirlediği APC listesine ekler. Esasen bu yeni çağırılan fonksiyon çok önemli. İncelerseniz burada anlattığımdan çok daha kritik şeyler yaptığını da görebilirsiniz fakat çok da uzatmak istemiyorum konuyu. Hatta açıkçası başta DPC ve APCleri anlatacaktım fakat APC çok uzayınca diğerine yer kalmadı... Bir de kesme falan dersem işin cılkı culku çıkıcak...

Bu şekilde APC oluşturup gönderme işlemini yapabilirsiniz. Bunun bir de kullanıcı modu için olanı var, yani kullanıcı modundaki uygulamaların APC oluşturması var o da gerekirse başka bir yazıya kalsın zaten yapıyı anlattım diğeri sadece fonksiyonları kullanmaktan ibaret..

Bu arada, bu iki aşamalı yolu kullanmaktansa *NtQueueApcThread()* fonksiyonunu da kullanabilirsiniz. Bu fonksiyon diğer iki fonksiyonun yaptığı şeyi yapmaktadır. Fakat yalnızca kullanıcı modunu hedefliyorsanız işe yarıyor diye biliyorum. Onun prototipi de şöyle:

```c
NtQueueApcThread(
    __in HANDLE ThreadHandle,
    __in PPS_APC_ROUTINE ApcRoutine,
    __in_opt PVOID ApcArgument1,
    __in_opt PVOID ApcArgument2,
    __in_opt PVOID ApcArgument3
    );
```

Evet, sanırım bu kadar.. Anlatılmasını istediğiniz konular için yahut yazılardaki hatalar için yorum atabilir veya mail gönderebilirsiniz.

Sevgiler.
