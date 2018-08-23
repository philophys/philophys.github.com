---
title: Windows Çekirdeğindeki Bazı Temel Veri Yapıları
categories: Bilgisayar
---

Selamlar.

Bu yazı 2012 yılında CodeMachine'de paylaşılmış yazının böyle tercümesi gibil bir şeydir. Windows 7 işletim sistemindeki temel veri yapılarını ve aşağı yukarı neler ile bağlantılı olduğunu anlatan kısa ve öz anlatımlar diyebiliriz.. Dilimizde de bu yapıların az çok belgelenmiş olması için burada paylaşıyorum.

## Çift Yönlü Bağlı Liste

### nt!_LIST_ENTRY

Windows çekirdeğindeki çoğu veri yapısı bağlı listelerde muhafaza edilir. `LIST_ENTRY` yapısı ise bu veri yapılarının döngüsel olarak muhafaza edilmesinde kullanılan yapıdır. `LIST_ENTRY` yapısı, veri yapısı listesinde hem başlangıç elemanını hem de geri kalan elemanları göstermek için kullanılır. Bu yapı genellikle listedeki elemanları tanımlayan daha büyük veri yapılarının içinde tutulur.

![](/files/bagli_liste.png)

Windbg hata ayıklayıcısındaki "dt -l" komutu, içerisinde `LIST_ENTRY` yapısı gömülen bağlı yapıların içerisindeki tüm `LIST_ENTRY` yapılarını, ve bunların elemanlarını yazdırır. Ayrıca "dl"(ayrıca !dflink) ve "db"(ayrıca !dblink) komutları yine çift yönlü bağlı listeleri sırasıyla ileriye ve geriye olacak şekilde gezmeye yardımcı olabilir.

**İlgili Fonksiyonlar**: InitializeListHead(), IsListEmpty(), InsertHeadList(), InsertTailList(), RemoveHeadList(), RemoveTailList(), RemoveEntryList(), ExInterlockedInsertHeadList(), ExInterlockedInsertTailList(), ExInterlockedRemoveHeadList()

## İşlem ve İşlemcik (Process, Thread)

### nt!_EPROCESS

Windows çekirdeği bir işlemi ve çekirdeğin o işlemi yönetebilmesi için gereken tüm bilgileri `EPROCESS` yapısında saklar. Sistemde çalışan her işlem için bir adet `EPROCESS` yapısı bulunmaktadır. Bu işlemlere çekirdekte çalışan iki işlem olan Sistem Boşta İşlemi(System Idle Process) ve Sistem İşlemi(System Process) de dahildir.

`EPROCESS` yapısı çekirdeğin yönetim(executive) bileşenine ait bir yapıdır. Bu yapı, tutamak tablosu(handle table), sanal hafıza, güvenlik, hata ayıklama, istisna, oluşturma bilgisi, G/Ç aktarma istatistikleri, işlem zamanlamaları gibi bilgileri içerir.

Sistem işleminin `EPROCESS` yapısı *nt!PsInitialSystemProcess* sabitinde, sistem boşta işleminin `EPROCESS` yapısı ise *nt!PsIdleProcess* sabitinde saklanmaktadır.

Herhangi bir işlem belki de aynı anda birden fazla gruba ait olabilir. Örneğin, bir işlem sistemde her zaman aktif olan işlemler listesinde olabilir, veya bir işlem belirli bir oturum(session) içerisinde çalışan bir grup işlemden biri olabilir, yahut bir işlem bir iş yapısının(job) bir parçası da olabilir. Bu grupların uygulamasını yapabilmek için, `EPROCESS` yapıları, yapılardaki farklı alanları kullanarak çoklu listelerin bir parçası halinde muhafaza edilirler.

**ActiveProcessLink** alanı sistemde bulunan işlemlerin `EPROCESS` yapılarının birbirine bağlı liste olarak muhafaza edilmesi için kullanılır, bu listenin en başını ise nt!PsActiveProcessHead sabiti gösterir. Benzer şekilde, **SessionProcessLinks** alanı aktif olan oturumdaki işlemlerin `EPROCESS` yapılarının bağlı bir şekilde tutulduğu alandır, bu alanın en başı ise **MM_SESSION_SPACE.ProcessList** sabitiyle gösterilmektedir. **JobLinks** alanı ise, en başının **EJOB.ProcessListHead** sabitiyle gösterildiği, sistemdeki bir iş'in parçası olan işlemlerin `EPROCESS` yapılarını bağlı bir şekilde tutulduğu alandır. Hafıza yöneticisinin global değişkeni olan **MmProcessList**, **MmProcessLinks** alanının muhafaza ettiği işlemlerin bağlı olarak tutulduğu listeyi gösteren alandır. Bu liste, *MiReplicatePteChange()* fonksiyonu tarafından işlemin çekirdek tarafındaki sanal adres alanını güncellemek için kullanılır.

İşleme ait tüm işlemcikler listesinin en başını ise **ThreadListHead** alanı gösterir. İşlemciklerin bu listeye eklenmesi sırasında kullanılan alan ise **ETHREAD.ThreadListEntry**'dir.

Bir çekirdek değişkeni olan *ExpTimerResolutionListHead*, *NtSetTimerResolution()* fonksiyonunu çağırarak süreölçer aralığını(timer interval) değiştirmek isteyen işlemler listesinin en başını muhafaza eder. Bu liste *ExpUpdateTimerResolution()* fonksiyonu tarafından tüm işlemlerde "time resolution" değerlerinin istenen en küçük değere güncellenmesi için kullanılır.

Windbg hata ayıklayıcısında bulunan "!process" komutu `EPROCESS` yapısı içerisindeki bilgileri gösterir. ".process" komutu ise hata ayıklayıcının sanal adres bağlam alanını(context) belli bir işleminkiyle değiştirmek için kullanılır. Bunun yapılması, canlı bir hata ayıklama yahut bir çökmeden alınan çıktının incelenmesi sırasında işlemin hata ayıklamasından geçmesi için önemlidir.

**İlgili Fonksiyonlar**: ZwOpenProcess(), ZwTerminateProcess(), ZwQueryInformationProcess(), ZwSetInformationProcess(), PsSuspendProcess(),PsResumeProcess(), PsGetProcessCreateTimeQuadPart(), PsSetCreateProcessNotifyRoutineEx(), PsLookupProcessByProcessId(), PsGetCurrentProcess(), PsGetCurrentProcessId(), PsGetCurrentProcessSessionId(), PsGetCurrentProcessWin32Process(), PsGetCurrentProcessWow64Process(), PsGetCurrentThreadProcess(), PsGetCurrentThreadProcessId(), PsGetProcessCreateTimeQuadPart(), PsGetProcessDebugPort(), PsGetProcessExitProcessCalled(), PsGetProcessExitStatus(), PsGetProcessExitTime(), PsGetProcessId(), PsGetProcessImageFileName(), PsGetProcessInheritedFromUniqueProcessId(), PsGetProcessJob(), PsGetProcessPeb(), PsGetProcessPriorityClass(), PsGetProcessSectionBaseAddress(), PsGetProcessSecurityPort(), PsGetProcessSessionIdEx(), PsGetProcessWin32Process(), PsGetProcessWin32WindowStation(), PsGetProcessWow64Process()

### nt!_KPROCESS
`EPROCESS` yapısı içerisinde gömülü, ve **EPROCESS.Pcb** alanında tutulan `KPROCESS` yapısı çekirdeğin düşük seviyedeki katmanları tarafından kullanılır ve zamanlayıcı ile alakalı bilgiler olan işlemcikler, kuantum, öncelik seviyesi, çalıştırılma süreleri gibi bilgileri içerir.

**ProfileListHead** alanı, bu işlem için oluşturulan profilleme nesnelerinin listesini içerir. Bu liste, profilleme kesmesi tarafından yönerge göstericisinin(instruction pointer) profillemesinin yapılabilmesi için kullanılır.

**ReadyListHead** bu işlem içerisinde çalıştırılmaya hazır bekleyen işlemciklerin listesini içerir. Bu liste yalnızca hafızada kalıcı olmayan işlemler için boş değildir. Hazırda bekleyen işlemciklerin `KTHREAD` yapıları bu listeye **KTHREAD.WaitListEntry** alanı ile bağlanırlar.

**ThreadListHead** alanı ise işlemde bulunan tüm işlemcikler listesinin en başını gösteren alandır. `KTHREAD` veri yapıları bu listeye **KTHREAD.ThreadListEntry** alanı kullanarak bağlanırlar. Bu liste çekirdek tarafından işlemde bulunan tüm işlemleri bulabilmek için kullanılır.

### nt!_ETHREAD

Windows çekirdeği, `ETHREAD` yapısını işlemcikleri tanımlamak için kullanır. Sistemde bulunan tüm işlemcikler için bir adet `ETHREAD` yapısı bulunmaktadır ve bu işlemciklere Sistem Boşta İşlemi'nde bulunan işlemcikler de dahildir.

`ETHREAD` yapısı çekirdeğin yönetim bileşenine ait bir yapıdır ve diğer yönetim bileşenleri olan G/Ç yöneticisi, güvenlik referans gözlemcisi, hafıza yöneticisi gibi bileşenlerin ihtiyaç duyduğu bilgileri tutar.

**Tcb** alanı, `ETHREAD` içerisinde gömülü olan `KTHREAD` yapısını içerir ve bu alan işlemcik zamanlama ile ilgili bilgileri tutar.

Tüm işlemler, içerisinde çalışan işlemcikleri tanımlayan `ETHREAD` yapılarının listesini `EPROCESS` yapısı içerisinde bulunan **TheadListHead** alanında tutarlar. `ETHREAD` yapıları bu listeye kendi yapılarındaki **ThreadListEntry** alanını kullanarak bağlanırlar.

**KeyedWaitChain** alanı belirli bir "keyed" olayında beklemekte olan işlemciklerin muhafaza edilmesi için kullanılır.

**IrpList** alanı bu işlemcik tarafından oluşturulan ve çeşitli sürücüler veya donanımlar tarafından işlenmeyi bekleyen IRPlerin listesini tutmaktadır. İşlemciğin sonlandırılması durumunda bu listede bulunan IRPlerin de iptal edilmesi gerekmektedir.

**CallbackListHead** alanı işlemciğin kayıt defterinde bir işlem yapması durumunda kayıt defteri filtreleme sürücülerini bilgilendirecek olan geriçağrımların tutulduğu bir bağlı listeyi gösterir. Bu alan, geriçağrımlardaki önce(pre) ve sonra(post) bildirimleri sırasında geçerlidir.

**Win32StartAddress** alanı, işlemciğin en baş fonksiyonunun adresini tutan alandır. Örneğin bu alan kullanıı modunda oluşturulan işlemcikleri için *CreateThread()* fonksiyonuna verilen fonksiyon, çekirdek modunda oluşturulan işlemcikler için ise *PsCreateSystemThread()* fonksiyonuna verilen fonksiyon olabilir.

**ActiveTimerListHead** alanı bu işlemcik tarafından aktif olarak işaretlenen (yani bir süre sonra sona erecek olan) süreölçer nesnelerinin tutulduğu listenin en başını göstermektedir. **ActiveTimerListLock** bu listeyi korumakta, **ETIMER.ActiveTimerListEntry** alanı ise diğer süreölçerlerin *ExpSetTimer()* fonksiyonu ile bu listeye eklenmesinde kullanılmaktadır.

Windbg hata ayıklayıcısının "!thread" komutu, işlemcik hakkında bilgi verir. ".thread" komutu ise hata ayıklayıcının CPU bağlam alanını belirli bir işlemciğinki ile değiştirmek için kullanılır.

**İlgili Fonksiyonlar** : PsCreateSystemThread(), PsTerminateSystemThread(), PsGetCurrentThreadId(), PsSetCreateThreadNotifyRoutine(), PsRemoveCreateThreadNotifyRoutine(), PsLookupThreadByThreadId(), PsIsSystemThread(), PsIsThreadTerminating(), ZwCurrentThread()

### nt!_KTHREAD

`ETHREAD` yapısı içerisinde gömülü olarak bulunan ve **ETHREAD.Tcb** alanında saklanan `KTHREAD` yapısı çekirdeğin düşük katmanları tarafından kullanılır ve işlemcik yığınları, zamanlama, APCler, sistem çağrıları, öncelik, çalıştırılma zamanları gibi bilgileri içerir.

**QueueListEntry** alanı `KQUEUE` yapısı ile ilişkili olan işlemcikleri birbirine bağlamak için kullanılır, bu listenin en başı ise **KQUEUE.ThreadListHead** alanı ile gösterilir. `KQUEUE` yapıları yönetim birimindeki işçi kuyruklarını (EX_WORK_QUEUE) ve G/Ç tamamlanma 
noktalarını uygulamaya geçirebilmek için kullanılırlar. Bu alan, *KiCommitThreadWait()* gibi fonksiyonlar tarafından mevcut işçi işlemciğin bir işçi kuyruğu dışında bir şeyi beklemesi durumunda kuyrukta olan diğer işlemcikleri aktif etmek için kullanılır.

**MutantListHead** alanı bu işlemciğin elde ettiği mutex nesnelerinin listesini tutmaktadır. KiRundownMutants() fonksiyonu işlemciğin sonlandırılması sırasında bu listeyi kontrol ederek bırakılmamış bir mutex nesnesi olup olmadığını kontrol eder. Böyle bir durumda sistemde THREAD_TERMINATE_HELD_MUTEX hatası oluşur.

**Win32Thread** alanı, işlemcik kendisini **UI** işlemciğine çevirdiğinde (yani *USER32* veya *GDI32* kütüphanelerine ait bir fonksiyon kullandığında) *Win32K.sys*'i tanımlayan yapı olan `W32THREAD` yapısına işaret eder. Bu çevrim işlemi *PsConvertToGuiThread()* fonksiyonu tarafından yapılır. Bir *Win32K.sys* fonksiyonu olan *AllocateW32Thread()*, *PsSetThreadWin32Thread()* fonksiyonunu çağırarak **Win32Thread** alanının değerini tanımlar. Her işlemcik için ayrılan bu yapının boyutu bir `Win32K.sys` değişkeni olan **W32ThreadSize** içerisinde saklanmaktadır.

**WaitBlock** alanı işlemciklerin yerel çekirdek nesnelerinde beklemek için kullandığı 4 adet `KWAIT_BLOCK` yapısından oluşan bir dizidir.
Bunlardan biri zaman aşımı ile beklemenin (yani süreölçer ile) uygulanabilmesi için ayrılmıştır, bu nedenle yalnızca KTIMER nesneleri ile kullanılabilir.

**WaitBlockList** alanı, işlemciğin bir veya daha fazla nesne üzerinde bekleme yaparken kullandığı `KWAIT_BLOCK` yapı dizisine işaret etmektedir. Bu alan, *KiCommitThreadWait()* fonksiyonu tarafından işlemcik bekleme durumuna geçmeden önce belirlenir. Eğer işlemciğin beklediği nesne sayısı `THREAD_WAIT_OBJECTS`(3) değerinden az ise, **WaitBlockList** yerleşik bir **WaitBlock[]** dizisine işaret eder fakat eğer işlemciğin beklediği nesne sayısı `THREAD_WAIT_OBJECTS` değerinden çok fakat `MAXIMUM_WAIT_OBJECTS`(64) değerinden az ise, bu durumda **WaitBlockList** alanı dışarıdan tahsisi yapılmış bir `KWAIT_BLOCK` dizisini gösterir. *ObpWaitForMultipleObjects()* fonksiyonu, `KWAIT_BLOCK` dizisini 'Wait' etiketini kullanarak tahsis eden fonksiyonlardan biridir.

**WaitListEntry** alanı belirli bir işlemcide bekleme durumunda olan işlemciklerin listesine `KTHREAD` yapılarını eklemek için kullanılır. Her Çekirdek İşlemci Kontrol Bloğu(KPRCB) içerisinde bulunan **WaitListHead** alanı, **KTHREAD.WaitListEntry** alanı yardımıyla listeye eklenen işlemciklerin başlangıçını tutmaktadır. İşlemcikler bu listeye *KiCommitThreadWait()* fonksiyonu ile eklenmekte, *KiSignalThread()* fonksiyonu ile silinmektedir.

**İlgili Fonksiyonlar** : KeWaitForSingleObject(), KeWaitForMultipleObject(), KeSetBasePriorityThread(), KeGetCurrentThread(), KeQueryPriorityThread(), KeQueryRuntimeThread(), KeSetSystemGroupAffinityThread(), KeRevertToUserAffinityThreadEx(), KeRevertToUserGroupAffinityThread(), KeDelayExecutionThread(), KeSetSystemAffinityThreadEx(), KeSetIdealProcessorThread(), KeSetKernelStackSwapEnable()

## Çekirdek ve Donanım Soyutlama Katmanı(HAL)

### nt!_KPCR

`KPCR` Çekirdek İşlemci Kontrol Bölgesi(Kernel Processor Control Region) denilen bir alanı temsil eder. Bu alan, her CPU için çekirdek ve HAL tarafından paylaşılan bilgileri içerir. Sistemde kaç tane CPU varsa, o kadar da `KPCR` yapısı bulunur.

Kullanımda olan CPU'nun `KPCR` alanı her zaman 32 bit sistemlerde `fs:[0]` aracılığıyla, 64 bit sistemlerde ise `gs:[0]` aracılığıyla erişime açıktır. Sıklıkla kullanılan çekirdek fonksiyonları olan *PsGetCurrentProcess()*,* KeGetCurrentThread()* gibi fonksiyonlar bilgileri bu yazmaçlar aracılığıyla `KPCR` yapısından alırlar.

**Prcb** alanı gömülü olarak Çekirdek İşlemci Kontrol Bloğu(Kernel Processor Control Block) denilen alanını temsil eden `KPRCB` yapısını içermektedir.

Windbg hata ayıklayıcısında bulunan "!pcr" komutu PCR içerisinde bulunan bazı bilgileri göstermek için kullanılabilir.

### nt!_KINTERRUPT

Kesme Servis Rutinleri (Interrupt Service Routine - ISR) bir kesme veya istisna meydana geldiğinde CPU tarafından çalıştırılmaktadır. Kesme Tanımlama Tablosu (Interrupt Descriptor Table - IDT), çekirdek tarafından kayıt edilmiş ISRlere işaret eden bir CPU tarafında tanımlı bir tablodur. Bu tablo, kesme veya istisna oluşması durumunda çalıştırılacak olan ISRnin bulunup işlenmesi için kullanılmaktadır. Toplamda 256 girdiye sahiptir, her biri kendine ait bir ISRye işaret edebilir. Kesme vektörü denilen değer ise IDTdeki belirli bir yere verilen indeks değeridir. `KINTERRUPT` yapısı ise sürücü tarafından tanımlanan, ve bu vektörlerden birinde bulunan bir ISRyi temsil eden yapıdır.

**DispatchCode** alanı kesme sırasında çalışacak olan ilk birkaç baytı içeren bir dizidir. Belirli bir vektör numarasına ait IDT girdisi direkt olarak **DispatchCode** dizisine işaret eder, burası da **DispatchAddress** tarafından belirtilen fonksiyonu çağırır. Burada belirtilen fonksiyon genelde *KiInterruptDispatch()*'dir ve görevi sürücü tarafından sağlanan ve **ServiceRoutine** alanında belirtilen *ISR*'nin çalışabileceği ortamı ayarlamaktır.

Mesaj Sinyalli Kesmeler (Message Signaled Interrupt - MSI) için **ServiceRoutine** alanı bir çekirdek fonksiyonu olan *KiInterruptMessageDispatch()* fonksiyonunu gösterir, bu fonksiyon sürücü tarafından sağlanan ve **MessageServiceRoutine** alanında bulunan MSI kesme servis rutinini çağırır.

**ActualLock** alanı, sürücü tarafından sunulan ISR çalıştırılmadan önce **SynchronizeIrql** alanında belirtilen *IRQL* seviyesinde elde edilen döneç kilit'e(spinlock) gösterici içerir.

PCI yolu üzerinde izin verilen kesme paylaşımı nedeniyle birkaç `KINTERRUPT` yapısı bir adet Kesme İsteği Hattı(Interrupt Request Line(IRQ)) üzerine kayıt edilebilir. Bu tür paylaşımlı kesme vektörleri için tanımlanan IDT girdileri ilk `KINTERUPT` yapısına işaretçi içerir,
ardından bu `KINTERUPT` yapısı kendi içerisinde diğer yapılara **InterruptListEntry** alanı ile bağlanır.

Hata ayıklayıcının "!idt -a" komutu belirli bir işlemcinin tüm Kesme Tanımlama Tablosu(Interrupt Description Table) içeriğini gösterir.

**İlgili Fonksiyonlar** : IoConnectInterrupt(), IoConnectInterruptEx(), IoDisconnectInterrupt(), IoDisconnectInterruptEx(), KeAcquireInterruptSpinLock(), KeReleaseInterruptSpinLock(), KeSynchronizeExecution()

### nt!_CONTEXT

`CONTEXT` yapısı, istisna bağlam alanının(exception context) CPU bağımlı parçası olan CPU yazmaçları gibi bilgileri içeren bir yapıdır. Örneğin *KiDispatchException()* gibi fonksiyonlar tarafından istisnaların işlenmesi için kullanılır.

`CONTEXT` yapısının bazı içerikleri *KeContextFromKframes()* fonksiyonu tarafından `KTRAP_FRAME` yapısında yakalanan yazmaç bilgileriyle değiştirilir. Aynı şekilde istisna işlendikten sonra `CONTEXT` yapısının değişen içeriği *KeContextToKframes()* fonksiyonu tarafından tekrardan `KTRAP_FRAME` yapısına geri döndürülür. Bu mekanizma yapılandırılmış istisna işleme(structured exception handling - SEH)nin uygulanmasında kullanılmaktadır.

**ContextFlags** alanı `CONTEXT` yapısındaki hangi alanların geçerli veri içerdiğini belirleyen bir bit maskesidir. Örneğin
`CONTEXT_SEGMENTS` değeri bağlam alanı(context) yapısındaki segment yazmaçlarının geçerli olduğu bilgisini verir.

Hata ayıklayıcının ".cxr" komutu hata ayıklayıcının mevcut yazmaç bağlam alanını `CONTEXT` yapısında saklananlar ile değiştirir.

**İlgili Fonksiyonlar** : RtlCaptureContext()

### nt!_KTRAP_FRAME

`KTRAP_FRAME` yapısı istisna veya kesmenin işlenmesi anında işlemcinin yazmaçlarında bulunan verinin kaydetmek için kullanılmaktadır. `KTRAP_FRAME` yapıları genellikle işlemciğin çekirdek modu yığınından tahsis edilmektedir. "Trap frame"lerin küçük bir bölümü işlemci tarafından kendi kesme ve istisna işleme işlemleri için doldurulmaktadır, geri kalan kısmı ise Windows tarafından sunulan *KiTrap0E()* veya *KiPageFault()* ve *KiInterruptDispatch()* gibi yazılım istisna ve kesme işleyicisi fonksiyonlar tarafından oluşturulmaktadır. x64 işlemcilerde, "trap frame"de bulunan ve uçucu olmayan(? non-volatile) yazmaç değerleri gibi bazı alanlar istisna işleyicileri tarafından doldurulmaz.

Hata ayıklayıcının ".trap" komutu hata ayıklayıcınn mevcut yazmaç bağlam alanını `KTRAP_FRAME` yapısı içerisinde tutulan ile değiştirir.

### nt!_KDPC

DPC rutinleri kesmelerin işlenmesini `DISPATCH_LEVEL` seviyesine ertelemek için kullanılır. Bu, işlemci tarafından yüksek seviye bir IRQL'de(örn DIRQLx) geçirilen toplam zamanı azaltır. DPC'ler ayrıca çekirdekte süresi geçen süreölçerler(timer) için bildirim alınırken de kullanılır. Genellikle Kesme servis rutinleri(ISRler) ve süreölçerler DPCleri kullanırlar.

Gecikmeli İşlem Çağrısı(Deferred Procedure Call - DPC), `KDPC` yapısı tarafından tanımlanır ve sürücü tarafından verilen ve `DISPATCH_LEVEL` seviyesinde yabancı bir işlemciğin bağlam alanında(arbitrary thread context) çalıştırılacak olan rutine işaretçi içerir.

Kesme servis rutinleri gibi kesmeye uğrayan işlemciğin yığınını kullanarak çalışan rutinlerin aksine, DPC rutinleri her işlemci için ayrı bulunan ve **KPCR.PrcbData.DpcStack** alanında saklanan yığın üzerinde çalışırlar.

`DEVICE_OBJECT` yapısı içerisindeki **Dpc** alanında `KDPC` yapısı barındırır, burası ISR'ler tarafından kullanılan DPC'yi içerir.

`KDPC` yapıları sistemde bulunan her işlemci için ayrı DPC kuyruğunda bulunur. `KPCR` veri yapısının **PrcbData.DpcData[0]** alanı bu kuyrukların en başını gösterir. `KDPC` yapısının **DpcListEntry** alanı ise bu listedeki DPC'leri yönetmek için kullanılır.

Hata ayıklayıcının "!pcr" ve "!dpcs" komutları tek bir CPU için DPC rutinleri hakkında bilgi vermektedir.

**İlgili Fonksiyonlar**: IoRequestDpc(), IoInitializeDpcRequest(), KeInitializeDpc(), KeInsertQueueDpc(), KeRemoveQueueDpc(), KeSetTargetProcessorDpcEx()

### nt!_KAPC

Eşzamanlı Olmayan İşlem Çağrısı (Asynchronous Procedure Call - APC) fonksiyonları belli bir işlemcikte `PASSIVE_LEVEL` veya `APC_LEVEL` seviyesinde çalışan fonksiyonlardır. Bu fonksiyonlar sürücüler tarafından istenilen işlemciğin bağlam alanında işlem yapmak için kullanılırlar, özellikle işlemin kullanıcı modu sanal adres alanına erişmek için. Windows işletim sistemindeki belli işlevsellikler (örneğin işlemciklerin işlemlere eklenmesi/ayrılması, işlemciklerin duraklatılıp devam ettirilmesi) APCler üzerine kurulan mekanizmalar aracılığıyla sağlanır. *Kullanıcı modu*, *normal çekirdek modu* ve *özel çekirdek modu* olmak üzere 3 çeşit APC vardır.

`KAPC` yapısı, sürücü tarafından belirlenen belirli bir işlemciğin bağlam alanında, `PASSIVE_LEVEL` veya `APC_LEVEL` seviyesinde çalışan belirli fonksiyonları, koşullar uygun olduğunda çalıştırmaya yarayan Eşzamanlı Olmayan İşlem Çağrılarının yapısını temsil eder.

**KTHREAD.ApcState.ApcListHead[]** dizisinde bulunan 2 girdi işlemcikte çalışmak için bekleyen kullanıcı ve çekirdek modu APClerinin listesini tutar. `KAPC` yapıları bu listelere kendilerinin **ApcListEntry** alanını kullanarak bağlanırlar.

**KTHREAD.SpecialApcDisable** alanının negatif bir değer alması özel ve normal çekirdek APClerinin o işlemcik için devre dışı kalmasına sebep olur.

**KTHREAD.KernelApcDisable** alanının negatif bir değer alması normal çekirdek APClerinin o işlemcik için devre dışı kalmasına sebep olur.

**NormalRoutine** alanı özel çekirdek APCleri için `NULL` değerini içerir. Normal çekirdek APCleri için ise `PASSIVE_LEVEL` seviyesinde çalışacak fonksiyon adresini içerir.

**KernelRoutine** alanı APC_LEVEL seviyesinde çalıştırılacak fonksiyonu gösterir.

**RundownRoutine** alanı işlemciğin sonlandırılmasına müteakip APCnin bırakılması esnasında çalıştırılacak fonksiyonu içerir.

Hata ayıklayıcının "!apc" komutu sistemdeki tüm işlemcikleri tarayarak bekleyen APC'leri bulur ve gösterir.

**İlgili Fonksiyonlar** : KeEnterGuardedRegion(), KeLeaveGuardedRegion(), KeEnterCriticalRegion(), KeLeaveCriticalRegion(), KeInitializeApc(), KeInsertQueueApc(), KeRemoveQueueDpc() KeFlushQueueApc(), KeAreApcsDiabled().

### nt!_KAPC_STATE

Windows çekirdeği, işlemciklerin kendi oluşturuldukları işlemden farklı olan işlemlere eklenip çıkarılmasına olanak sağlamaktadır. Bu işlevsellik, işlemciklerin geçici olarak başka işlemlerin kullanıcı modu sanal hafıza alanına erişimine izin vermektedir. `KAPC_STATE` yapısı, işlemcik başka bir işleme eklendiğinde o işlemcik için sıraya alınan APClerin listesinin tutulması için kullanılmaktadır. APCler işlemciklere (ve işlemlere) özel olduklarından, herhangi bir işlemcik kendisinin asıl işleminden başka bir işleme eklendiğinde o işlemciğin APC durum verisinin saklanmasına ihtiyaç duyulmaktadır. Bu gereklidir, çünkü bu işlemcik için sıralanmış olan APCler, işlemcik oluşturulduğu asıl işlem dışındaki bir işleme eklendiğinde çalıştırılamazlar. `KTHREAD` yapısı iki adet `KAPC_STATE` yapısı saklamaktadır. Bunlardan biri işlemciğin kendi işlemi, diğeri ise eklendiği işlem içindir. İşlemciğin yuvalı/iç içe bir ek yapması durumunda, çağırıcının mevcut APC durum değişkenlerini saklamak ve yeni bir APC ortamına taşımak için daha fazla `KAPC_STATE` veri yapısına alan sağlaması gerekmektedir.

**ApcListHead** dizisinde bulunan 2 girdi, işlemcik için bekleyen kullanıcı ve çekirdek modu APC listelerinin en başını göstermektedir. `KAPC` yapıları bu listelere **ApcListEntry** alanı ile bağlanmaktadır.

**İlgili Fonksiyonlar** : KeAttachProcess(), KeDetachProcess(), KeStackAttachProcess(), KeUnstackDetachProcess().

## Eşzamanlama Nesneleri(Synchronization Objects)

### nt!_DISPATCHER_HEADER

Windows işletim sistemindeki yerel çekirdek nesneleri, işlemciklerin dolaysız olarak *KeWaitForSingleObject()* fonksiyonu ve benzerleri ile bekleyebilecekleri veri yapılarıdır. Bu yapılardaki mekanizma esasen çekirdek içerisinde uygulanıyor olsa da, yapıların çoğu yerel Win32 API'si ile kullanıcı modunda çalışan uygulamalara da açılmaktadır. Örneğin işlemcikler, olaylar(events), semaforlar(semaphores), muteksler, süreölçerler(timer), işlemler ve kuyrukler(queues) yerel çekirdek nesnelerinden bazılarıdır. 
 
`DISPATCHER_HEADER` yapısı tüm yerel çekirdek nesnelerinde gömülü şekilde bulunmaktadır ve bu yapı işlemciklerin zamanlayıcıda uygulanan bekleme işlevselliğinde kilit rol oynamaktadır.

Her `KTHREAD` yapısı, işlemcikleri yerel çekirdek nesneleri ile durdurmakta kullanılan `KWAIT_BLOCK` yapılarından oluşan bir dizi içerir. Yerel çekirdek nesnelerinde bulunan `DISPATCHER_HEADER` yapısının **WaitListHead** alanı, `KWAIT_BLOCK` yapılarından oluşan bir listeye işaret etmekte bu yapılardan her biri ise beklenen bir yerel çekirdek nesnesini tanımlamaktadır. **KWAIT_LOCK.WaitListEntry** alanı bu listelerde bulunan `KWAIT_BLOCK` yapılarını tutmak için kullanılmaktadır. Herhangi bir yerel çekirdek nesnesi işaretlenmiş duruma(signaled) geçtiğinde bir veya birden fazla `KWAIT_BLOCK` yapısı bu listelerden silinmekte ve sözkonusu olan işlemcik *Ready*(Hazır) durumuna geçmektedir.

**Type** alanı `DISPATCHER_HEADER` yapısının gömülmüş olduğu nesne tipini belirtmektedir. Bu değer `nt!_KOBJECTS` ile belirtilen ilk 10(güncel mi acaba bu sayı?) değerden biridir. Bu alan `DISPATCHER_HEADER` içerisindeki diğer alanların nasıl yorumlanması gerektiğini belirler.

**Lock** alanı(7. bit) nesneye özgü bir döneç kilit(spin lock) sağlar. Bu kilit `DISPATCHER_HEADER` yapısında bulunan **SignalState** ve **WaitListFields** alanlarını korur. **SignalState** alanı nesnenin işaretlenmiş olup olmadığını belirler.

**İlgili Fonksiyonlar** : KeWaitForSingleObject(), KeWaitForMultipleObjects(), KeWaitForMutexObject() vb.

### nt!_KEVENT

`KEVENT` yapısı çekirdekte bulunan olay nesnesi(event) için veri yapısını temsil eder. Olaylar 2 türlü olarak ele alınmaktadır. Eşzamanlama (Synchronization - Otomatik sıfırlama) ve Bildirim (Notification - El ile sıfırlama). Herhangi bir eşzamanlama nesnesi bir işlemcik tarafından işaretlendiğinde yalnızca bir adet işlemcik tekrar çalışabilir duruma gelir, fakat eğer bildirim nesnesi bir işlemcik tarafından işaretlenirse bu defa o bildirim nesnesini bekleyen tüm işlemcikler tekrar çalışabilir duruma geçerler. `KEVENT` yapıları *KeInitializeEvent()* fonksiyonu ile bağımsız bir yapı olacak şekilde oluşturulabilir, yahut *ZwCreateEvent()* fonksiyonu, ve çekirdekteki APIler tarafından asıl olarak kullanılan fonksiyon olan *IoCreateSynchronizationEvent()* ve *IoCreateNotificationEvent()* fonksiyonları ile olay nesnesi olarak oluşturulabilirler. Olay nesneleri, bekleyen işlemciklerin takibinin yapılması ve gerektiğinde bu işlemcilerin uyandırılması ile ilgili bilgileri içeren `DISPATCHER_HEADER` yapısı etrafında oluşturulmaktadırlar.

**İlgili Fonksiyonlar**: KeInitializeEvent(), KeSetEvent(), KeClearEvent(), KeResetEvent(), KeReadStateEvent(), KeWaitForSingleObject(), KeWaitForMultipleObject(), IoCreateSynchronizationEvent() ve IoCreateNotificationEvent().

### nt!_KSEMAPHORE

`KSEMAPHORE` yapısı çekirdek semafor veri yapısını temsil eder. Semaforlar işlemcikler tarafından *KeWaitForSingleObject()* fonksiyonu kullanılarak istenirler. Eğer semaforu elde etmiş işlemcik sayısı semafor limitini geçmişse, *KeWaitForSingleObject()* fonksiyonun çağıran sonraki işlemcikler bekleme durumuna geçerler. Bekleyen işlemciklerden herhangi biri semaforu kullanan diğer işlemcikler *KeReleaseSemaphore()* fonksiyonun çağırdığında beklemede durumundan çıkar ve çalıştırılmaya hazırlanırlar.

Semafora istekte bulunmuş toplam işlemcik sayısı **Header.SignalState** alanında tutulur. **Limit** alanı ise en fazla kaç adet işlemciğin aynı anda semafor üzerinde istekte bulunabileceğini gösterir. 

**İlgili Fonksiyonlar** : KeInitializeSemaphore(), KeReadStateSemaphore(), KeReleaseSemaphore()

### nt!_KMUTANT

`KMUTANT` yapısı çekirdek muteks veri yapısını temsil eder. Muteks, yalnızca bir adet işlemcik tarafından herhangi bir anda elde edilebilir, fakat aynı işlemcik muteksi özyinelemeli olarak tekrar elde edebilir.

**OwnerThread** alanı muteks nesnesini kullanan işlemciğin `KTHREAD` yapısına gösterici içerir.

Her işlemcik kendisi tarafından elde edilmiş mutekslerin listesini **KTHREAD.MutantListHead** bağlı listesinde saklamaktadır. Muteks nesnelerindeki **MutantListEntry** alanı muteksin bu listeye eklenmesi sırasında kullanılmaktadır.

**ApcDisable** alanı muteksin çekirdek mi yoksa kullanıcı modu nesnesi mi olduğunu belirtir. **0** değeri muteksin kullanıcı moduna ait olduğunu, diğer herhangi bir değer ise çekirdek moduna ait olduğunu gösterir. Bu alan ayrıca APC nesnelerinin kullanılabilirliği ile de ilişkilidir.

**Abandoned** alanı muteksin bırakılmadan silinmesi durumunda işaretlenir. Bu durum `STATUS_ABANDONED` istisnasının ortaya çıkmasına sebep olabilir.

**İlgili Fonksiyonlar** : KeInitializeMutex(), KeReadStateMutex(), KeReleaseMutex(), KeWaitForMutexObject()

### nt!_KTIMER

`KTIMER` yapısı süreölçer(timer -belki sayaç demek yapısına daha uygun-) nesnelerini temsil eder. Herhangi bir işlemcik uyku aşamasına geçtiğinde yahut "dispatcher" nesnesi için beklediğinde gereken bekleme süresi Windows çekirdeği tarafında temel olarak `KTIMER` yapısı ile uygulanmaktadır.

Çekirdek, **KiTimerListHead[]** ismi verilen ve 512 adet listenin başlangıçını gösteren bir dizi tutmaktadır, bunların her biri
bir süre sonra sona erecek olan `KTIMER` nesnelerinin listelerini tutmaktadır. **TimerListEntry** alanı bu listede bulunan `KTIMER` yapılarını saklamak için kullanılır.

Bir süreölçer dolduğunda, onu bekleyen bir işlemciği uyandırabilir veya DPC kullanarak bir sürücüyü süreölçerin dolduğu konusunda bilgilendirebilir, DPC için gerekli olan veri yapısı **Dpc** alanında tutulmaktadır. Süreölçerler epizodik (bir kerelik) veya periyodik(iptal edilinceye kadar belirli aralıklarla devam eden) türde olabilirler.

Hata ayıklayıcının "!timer" komutu sistemde aktif olan tüm `KTIMER` yapıları hakkına bilgi verir.

**İlgili Fonksiyonlar** : KeInitializeTimer(),KeSetTimer(), KeSetTimerEx(), KeCancelTimer(), KeReadStateTimer()

### nt!_KGATE

`KGATE` bir çekirde kapı nesnesini tanımlamaktadır. `KGATE`ler tarafından sunulan işlev, eşzamanlama nesnelerinden olan `KEVENT`lere oldukça benzemektedir, fakat `KGATE` yapıları `KEVET`lere oranlara çok daha verimlidir.

İşlemcik olay, semafor, muteks gibi bir "dispacher" nesnesini beklerken *KeWaitForSingleObject()* veya onun varyantı olan ve bekleme sırasında meydana gelebilecek durumları(örneğin alert, APC veya işçi işlemciğin uyanması gibi) işleyebilen çeşitli fonksiyonları kullanır. Diğer tarafta bir `KGATE` nesnesi üzerinde bekleme yapmak için özel bir fonksiyon olan *KiWaitForGate()* kullanılır, bu fonksiyon diğer bekleme fonksiyonlarındaki özel durum kontrollerini yapmadığı için çok daha verimli çalışır. Bu nesneyi kullanmanın olumsuz tarafı ise işlemciğin eşzamanlı olarak başka bi `KGATE` nesnesini ve diğer "dispacher" nesnelerini beklememesi olarak gösterilebilir.

`KGATE` APIleri iç kısımda çekirdek tarafından kullanılmakta olup, sürücülerin kullanabilmesi için dışarıya aktarılmamışlardır. `KGATE`ler çekirdekte birçok yerde kullanılmaktadır bunlardan biri de korunan mutekslerdir. Bu mutekslerde, muteks kullanılabilir olmadığında esasen bir `KGATE` nesnesinde bekleme yapılmaktadır.

**İlgili Fonksiyonlar** : KeWaitForGate(), KeInitializeGate(), KeSignalGateBoostPriority()

### nt!_KQUEUE

`KQUEUE`, çekirdek kuyruk veri yapısını temsil etmektedir. `KQUEUE`ler yönetim biriminde bulunan yönetim iş kuyruklarını, işlemcik havuzlarını ve G/Ç tamamlanma noktalarını uygulamaya geçirmek için kullanılmaktadır.

Birçok işlemcik eşzamanlı olarak *KeRemoveQueueEx()* fonksiyonuna çağrıyla bir kuyrukta bekleyebilir. Bir kuyruk öğesi(içerisinde `LIST_ENTRY` bulunan herhangi bir veri yapısı) kuyruğa eklendiğinde, bekleyen işlemcikleden biri uyanır, bu işlemciğe kuyruğa ekleme yapabilmesi için kuyruk öğesine bir işaretçi verilir.(?)

*KeWaitForSingleObject()*, *KeWaitForMultipleObjects()* gibi bilinen çekirdek bekleme fonksiyonları bir kuyrukla ilişkisi olan işlemciklerle uğraşmak için özel yeteneklere sahiptir. Ne zaman bu tür bir işlemcik bir kuyruk dışında "dispatcher" nesnesini beklese, bu kuyrukla ilişkili olan başka bir işlemcik uyanarak kuyruktaki sonraki öğeleri işler. Bu kuyruğa eklenen öğelerin en kısa zamanda işlenmesini sağlar.

**EntryListHead** alanı kuyruğa öğe içerisinde bulunan `LIST_ENTRY` yapısı ile eklenmiş olan tüm öğeleri tutan bir listenin başını göstermektedir. *KiAttemptFastInsertQueue()* fonksiyonu kuyruğa öğeleri eklemekte, *KeRemoveQueueEx()* ise kuyruktan öğeleri silmektedir.

**ThreadListHead** alanı bu kuyrukla ilişkili olan işlemciklerin bir listesidir. Benzer tüm işlemciklerin **KTHREAD.Queue** alanı kendi ilişkili oldukları kuyruğa işaret etmektedir.

**CurrentCount** alanı aktif olarak kuyruk öğelerini işleyen işlemciklerin sayısını göstermektedir, buradaki değer en fazla **MaximumCount** alanında belirtilen değer kadar olabilir. Bunu da sistemdeki işlemci sayısı belirlemektedir.

**İlgili Fonksiyonlar** : KeInitializeQueue(), KeInsertQueue(), KeRemoveQueue(), KeInsertHeadQueue()

## Yönetim ve Çalışma Zamanı Kütüphanesi (Executive and Run Time Library)

### nt!_IO_WORKITEM

Sürücüler bazı rutinlerin çalışmasını `PASSIVE_LEVEL`'e ertelemek için iş öğeleri(work item) kullanmaktadır. Bu rutinler çekirdek işçi işlemcikleri(kernel worker threads) tarafından `PASSIVE_LEVEL` seviyesinde çalıştırılırlar. Sürücü tarafından sunulan iş rutinlerine işaretçi içeren iş öğeleri sürücüler tarafından sabit sayıda bulunan çekirdek iş kuyruklarına koyulur. Çekirdek, işçi işlemcikleri yardımıyla (örneğin *ExpWorkerThread()*) bu iş öğelerini kuyruktan çıkarıp içlerinde bulunan iş rutinlerini çağırır. `IO_WORKITEM` yapısı iş öğelerini temsil etmektedir.

Bir çekirdek değişkeni olan *nt!ExWorkerQueue*, *Critical*, *Delayed* ve *HyperCritical* olmak üzere 3 adet ayrı iş kuyruğunu tanımlayan `EX_WORK_QUEUE` yapısı içeren bir dizidir. **WorkItem** alanı `IO_WORK_ITEM` yapısına sahip iş öğelerini bu kuyruklara eklemek için kullanılır.

*IoQueueWorkItemEx()* fonksiyonu *IoObject*'e bir referans, bir de sürücü veya aygıt nesnesine işaretçi alır. Bunun nedeni iş rutininin çalışması sırasında sürücünün/aygıtın silinmesini önlemektir.

`WORK_QUEUE_ITEM` yapısında bulunan **WorkerRoutine** alanı, G/Ç yöneticisi tarafından sağlanan ve *IopProcessWorkItem()* olarak isimlendirilen bir fonksiyona işaret etmektedir. Esasen bu fonksiyon sürücü tarafından sunulan iş rutinini çağırmakta ve *IoObject* üzerindeki referans sayımını azaltmaktadır.

**Routine** alanı sürücü tarafından sunulan ve `PASSIVE_LEVEL` seviyesinde çalıştırılacak olan işçi rutinini gösterir.

Hata ayıklayıcının "!exqueue" komutu işçi kuyrukları(worker queues) ve işçi işlemcikler(worker threads) hakkında bilgi vermektedir.

**İlgili Fonksiyonlar** : IoAllocateWorkItem(), IoQueueWorkItem(), IoInitializeWorkItem(), IoQueueWorkItemEx(), IoSizeofWorkItem(), IoUninitializeWorkItem(), IoFreeWorkItem().

## G/Ç Yöneticisi (I/O Manager)

### nt!_IRP

`IRP` yapısı, G/Ç istek paketi ismi verilen yapıları temsil etmektedir. Bu yapı belirli G/Ç işlemini gerçekleştirmek için gereken tüm parametreleri, ve bu işlemin sonucuyla ilgili bilgileri içermektedir. Ayrıca IRPler işlemcikten bağımsız çağrı yığını olarak işlemcikler arası veri taşıması yapabilmekte, veya sürücülerde uygulanan kuyruklarda DPCler ile taşınabilmektedirler. IRPler Windows'un eşzamanlı olmayan G/Ç işleme modelinde kilit rol oynamaktadırlar, bu modelde uygulamalar birden fazla G/Ç işlemini tetikleyebilmekte ve bunların sürücü veya donanımlar aracılığıyla işlendikten sonra gelecek cevabı beklemeden diğer işlerine devam edebilmektedirler. Bu eşzamanlı olmayan model, üst düzeyde verim ve ayrıca alternatiflerine göre uygun düzeyde kaynak kullanımına izin vermektedir. IRPlerin tahsis edilmesi G/Ç Yöneticisi tarafından yapılmaktadır, bu bileşen windows çekirdeğinde Win32 G/Ç fonksiyonları tarafından yapılan çağrılara cevap vermekle sorumludur. IRPler ayrıca çekirdekte çalışan aygıt sürücüleri tarafından G/Ç istekleri için tahsis edilebilmektedirler. IRPler bir sürücü zincirinde hareket ederler, burada her sürücü IRPyi kendinden sonraki sürücüye göndermeden önce kendi yapması gereken işlemi IRP üzerinde gerçekleştirir ardından *IoCallDriver()* çağırır. Genellikle en altta bulunan sürücü IRPyi *IoCompleteRequest()* yardımıyla tamamlar, bu durumda sürücü zincirindeki diğer tüm sürücüler IRPnin işlendiği bilgisini alır ve bu sürücülere IRP üzerinde rötüş yapma şansı verilir.

IRPler sabit uzunluklu bir başlıktan oluşmaktadır, örnek olarak bir IRP kendi IRP yapısı ve devamında **StackCount** alanında saklanan değişken sayıda yığın konumu(stack location) içermektedir, bu yığın konumları da `IO_STACK_LOCATION` yapısı ile tanımlanmaktadır. IRPler en az kendisin işleyecek olan sürücü zincirinde bulunan aygıt kadar sayıda yığın konumu içermek zorundadırlar. Bir sürücü zincirinde kaç adet aygıt nesnesi olduğu bilgisi **DEVICE_OBJECT.StackSize** alanında tutulmaktadır. IRPler genellikle sabit boyutlarda tahsis yapmaya olanak sağlayan "look-aside" listelerinden tahsis edilmektedir. Dolayısıyla G/Ç yöneticisi tarafından tahsis edilen IRPler, IRP tarafından hedeflenen sürücü zincirindeki aygıt nesne sayısına göre 10 veya 4 adet(?) G/Ç yığın konumuna sahip olabilir.

Bazı IRPler **ThreadListEntry** alanını kullanılarak kendilerini oluşturan işlemciğe özel olarak kuyruklanmaktadır. Bu listenin en başı **ETHREAD.IrpList** alanında tutulmaktadır.

**Tail.Overlay.ListEntry** alanı sürücüler tarafından IRPyi bir iç kuyrukta muhafaza etmek için kullanılır, tipik olarak bir `LIST_ENTRY` yapısıyla `DEVICE_OBJECT` yapısı oluşturan sürücünün aygın eklentisi(device extension) içerisinde saklanır.

**Tail.CompletionKey** alanı IRP bir G/Ç tamamlama noktasına(I/O completion port) kuyruklandığında kullanılmaktadır.

Hata ayıklayıcının "!irp" komutu herhangi bir IRP hakkında bilgi almak için kullanılabilir. "!irpfind" komutu ise, sayfalanamaz(non-paged) havuzunda bulunan bütün veya belirli IRPleri bulmak için kullanılabilir.

**İlgili Fonksiyonlar** : IoAllocateIrp(), IoBuildDeviceIoControlRquest(), IoFreeIrp(), IoCallDriver(), IoCompleteRequest(), IoBuildAsynchronousFsdRequest(), IoBuildSynchronousFsdRequest(), IoCancelIrp(), IoForwardAndCatchIrp(), IoForwardIrpSynchronously(), IoIsOperationSynchronous(), IoMarkIrpPending().

### nt!_IO_STACK_LOCATION

`IO_STACK_LOCATION` yapısı sürücü zincirinde olan bir sürücünün yapması gereken G/Ç işlemi hakkında bilgi içerir. IRP birden fazla G/Ç yığın konumu içermektedir, bu konumlar IRP'nin tahsisi sırasında tahsis edilmektedir. En az aygıt yığınında olan aygıt kadar IRP içerisinde G/Ç yığın konumu bulunmaktadır. IRP içerisinde bulunan yığın konumları aygıtlar tarafından ters sırada sahiplenilmektedir örneğin aygıt yığınında bulunan en üst aygıt IRPde bulunan en alt yığın konumuna sahiptir. G/Ç yöneticisi G/Ç yığın konumunu yalnızca en üstte bulunan aygıt için hazır hale getirir, tüm sürücüler tarafından bu konumların zincirdeki bir sonraki aygıt için ayarlanmasını yapılmalıdır.

**Parameters** alanı ilgili sürücünün yapması gereken her bir G/Ç işlemini tanımlayan birçok yapıdan oluşan bir birliktir. Bu birlikte seçilecek olan yapı **MajorFunction** alanına bağlıdır. Burada bulunabilecek muhtemel değerler wdm.h dosyası içerisinde IRP_MJ_xxx şeklinde tanımlanmıştır. Bazı "major" fonksiyonlar ayrıca kendileri ile ilgili "minor" fonksiyonlara sahiptir. Örneğin IRP_MN_START_DEVICE "minor" fonksiyonu, IRP_MJ_PNP "major" fonksiyonuna aittir.

**İlgili Fonksiyonlar** : IoGetCurrentIrpStackLocation(), IoGetNextIrpStackLocation(), IoCopyCurrentIrpStackLocationToNext(), IoSkipCurrentIrpStackLocation(), IoMarkIrpPending()

### nt!_DRIVER_OBJECT

`DRIVER_OBJECT` yapısı, hafızaya yüklenmiş olan bir sürücü imajını temsil eder. G/Ç yöneticisi sürücü hafızaya yüklenmeden önce sürücü nesnesini oluşturur ve *DriverEntry()* fonksiyonun bu nesneye bir gösterici alır. Benzer şekilde sürücü nesnesi, sürücü hafızadan kaldırıldıktan sonra silinir.

**MajorFunction** alanı her elemanın sürücü tarafından sağlanan ve gönderi(dispatch) giriş noktaları olarak bilinen fonksiyonları gösterdiği bir dizidir. Bu giriş noktaları G/Ç yöneticisi tarafından sürücülere işlenecek IRPleri göndermek için kullanılır.

**DriverName** alanı, sürücünün nesne yöneticisi isim alanında belirtilen ismini içerir.

**DriverStart** alanı, sürücünün çekirdek sanal adres alanına yüklendiği adresi, **DriverSize** alanı ise sürücünün kaç baytlık bir alan işgal ettiği bilgisini saklar. Bu alan ayrıca en yakın olan sayfa sınırına yuvarlanmış şekilde saklanmaktadır.

**FastIoDispatch** alanı dosya sistemi sürücüleri(file system drivers) tarafından sunulan fonksiyonların tutulduğu `FAST_IO_DISPATCH` yapısına işaretçi içermektedir.

**DriverSection** alanı `LDR_DATA_TABLE_ENTRY` yapısına işaretçi içerir. Bu yapı yükleyici tarafından sürücünün imajının hafızada takibi için kullanılır.

Hata ayıklayıcının "!drvobj" komutu sürücü nesnesi hakkında bilgi verir.

**İlgili Fonksiyonlar**: IoAllocateDriverObjectExtension(), IoGetDriverObjectExtension()

### nt!_DEVICE_OBJECT

`DEVICE_OBJECT` yapısı, sistemdeki mantıksal veya fiziksel aygıtları temsil eden yapıdır. Sürücü hafızaya yüklenmeden önce G/Ç yöneticisi tarafından oluşturulan sürücü nesnelerinin aksine `DEVICE_OBJECT` yapıları sürücünün kendisi tarafından oluşturulur. G/Ç istekleri beklenenin aksine her zaman sürücü nesneleri yerine aygıt nesnelerini hedeflemektedirler. Hangi G/Ç isteğinin hedeflendiğini belirtmek amacıyla aygıt nesnesini gösteren bir gösterici sürücü gönderi(dispatch) rutinlerinde gönderilmektedir.

Sürücü nesneleri, sürücü tarafından oluşturulmuş olan aygıtların bağlı listesini tutmaktadır. Bu liste `DRIVER_OBJECT.DeviceObject` içerisinde bulunmakta ve **NextDevice** alanı kullanılarak aygıt nesneleri birbirine bağlanmaktadır. Aygıt nesneleri ise, sırayla **DriverObject** alanı ile kendisine sahip olan sürücü nesnesine işaret etmektedir. Aygıt nesneleri sistem tanımlı veri yapıları olsa da kendilerinin sürücüye özgü eklentilerine sahip olabilirler. Bu eklenti verisi aygıt nesnesi ile birlikte sayfalanamaz(non-paged) bir havuzdan, çağıranın belirttiği uzunlukta tahsis edilmektedir, bu eklentiyi gösteren bir gösterici de **DeviceExtension** alanında bulunmaktadır.

Aygıt nesneleri aygıtların bir yığın oluşturduğu diğer cihaz nesneleri ile katmanlı bir yapıda olabilir. **StackSize** alanı kendi sürücü nesnesi dahil olarak, yığında kaç adet daha aygıt nesnesi olduğu bilgisini verir. Bu alan ayrıca G/Ç yöneticisi tarafından hedeflenen aygıt nesnesi yığını için gerekli sayıda G/Ç yığun konumu tahsisi yapmak amacıyla da kullanılmaktadır. **CurrentIrp** ve **DeviceQueue** alanları yalnızca sürücü, aygıt için sistem tarafından yönetilen G/Ç kullandığında kullanılmaktadır, bu özellik sürücülerde nadiren kullanılır. Bundan dolayı çoğu durumda **CurrentIrp** alanı `NULL` değerine sahiptir. **AttachedDevice** alanı aygıt yığınındaki sonraki yüksek seviyedeki aygıt nesnesine işaretçidir.

Hata ayıklayıcının "!devobj" komutu aygıt nesnesi hakkında bilgi vermektedir.

**İlgili Fonksiyonlar** : IoCreateDevice(), IoDeleteDevice(), IoCreateDeviceSecure(), IoCreateSymbolicLink(), IoCallDriver(), IoCreateFileSpecifyDeviceObjectHint(), IoAttachDevice(), IoAttachDeviceToDeviceStack(), IoDetachDevice(), IoGetAttachedDevice(), IoGetAttachedDeviceReference(), IoGetLowerDeviceObject(), IoGetDeviceObjectPointer(), IoGetDeviceNumaNode()

### nt!_FILE_OBJECT

`FILE_OBJECT` yapısı açılmış olan bir sürücü objesini temsil etmektedir. Dosya nesneleri kullanıcı modu işlemi *CreateFile()* veya *NtCreateFile()* fonksiyonunu çağırdığında, çekirdek modunda ise sürücülerin *ZwCreateFile()* fonksiyonunu çağırmasıyla oluşturulmaktadır. Birden fazla dosya nesnesi **DEVICE_OBJECT.Flags** alanında bulunan `DO_EXCLUSIVE` biti aktif olmadığı sürece aynı aygıt nesnesine işaret edebilir.

**DeviceObject** alanı, dosya nesnesinin temsil ettiği dosya örneğini açan aygıt nesnesine işaret etmektedir. Event alanı gömülü bir olay yapısı içermektedir, bu olay yapısı işlemciğin üzerinde eşzamanlı G/Ç yapmak istediği aygıt nesnesinin sahibi olan sürücünün aslında 
eşzamanlı olmayan G/Ç işlemi yapması durumunda işlemciği durdurmak için kullanılmaktadır.

**FsContext** ve **FsContext2** alanları Dosya Sistemi Sürücüleri(File System Driver (FSD)) tarafından dosya nesnelerini ve belirli bağlam alanı bilgisini saklamak için kullanılmaktadır. Dosya sistemi sürücüsü tarafından kullanıldığında **FsContext** alanı dosya veya dosya içerisindeki bir akış hakkında bilgi içeren `FSRTL_COMMON_FCB_HEADER` veya `FSRTL_ADVANCED_FCB_HEADER` türünde veri yapısına işaret etmektedir. Aynı dosyanın (veya akışın) farklı örneklerini temsil eden birden fazla `FILE_OBJECT` yapısının **FsContext** alanı aynı Dosya Kontrol Bloğuna(File Control Block - FCB) işaret etmektedir. **FsContext2** alanı önbellek kontrol bloğuna işaret etmektedir, bu blok FSD'nin dosya veya akışa(stream) özgü bilgi depolamak için kullandığı bir veri yapısıdır.

**CompletionContext**, **IrpList** ve **IrpListLock** alanları dosya nesnesi bir G/Ç tamamlanma noktası ile ilişkiliyse kullanılmaktadır. **CompletionContext** alanı *NtSetInformationFile()* fonksiyonu tarafından **FileCompletionInformation** sınıfı ile çağırıldığında ayarlanmaktadır. **CompletionContext.Port** alanı tamamlanan ve geri alınmayı bekleyen IRPlerin listesini içeren bir `KQUEUE` yapısına işaret etmektedir. *IoCompleteRequest()* IRPleri bu listeye **IRP.Tail.Overlay.ListEntry** alanı ile eklemektedir.

Hata ayıklayıcının "!fileobj" komutu dosya nesnesi hakkında bilgi vermektedir.

**İlgili Fonksiyonlar** : IoCreateFile(), IoCreateFileEx(), IoCreateFileSpecifyDeviceObjectHint(), IoCreateStreamFileObject(), IoCreateStreamFileObjectEx(), ZwCreateFile(), ZwReadFile(), ZwWriteFile(), ZwFsControlFile(), ZwDeleteFile(), ZwDeviceIoControlFile(), ZwFlushBuffersFile(), ZwOpenFile(), ZwFsControlFile(), ZwLockFile(), ZwQueryDirectoryFile(), ZwQueryEaFile(), ZwCancelIoFile(), ZwQueryFullAttributesFile(), ZwQueryInformationFile(),ZwQueryVolumeInformationFile(), ZwSetEaFile(), ZwSetInformationFile(), ZwSetQuotaInformationFile(), ZwSetVolumeInformationFile(), ZwUnlockFile(), ZwWriteFile()

## Nesneler ve Tutamaklar (Objects, Handles)

### nt!_OBJECT_HEADER

Windows işletim sisteminde bulunan nesneler sıkça kullanılan özelliklerini(örneğin dosyalar, işlem ve işlemcikler, sürücüler vb.) temsil eden, Windows çekirdeğinin bir bileşeni olan Nesne Yöneticisi(Object Manager) tarafından yönetilen çekirdek veri yapılarıdır. Tüm bu nesneler kendilerinin öncesinde `OBJECT_HEADER` denilen, nesne hakkında bilgi içerip yaşam süresi boyunca yönetilmesini, nesnenin benzersiz olarak isimlendirilmesini, nesne üzerinde erişim kontrollerinin yapılmasını sağlayan, nesneye özgü metodları çağıran ve tahsiscinin kota kullanımını incelemeye imkan sunan bir veri yapısıdır.

`OBJECT_HEADER` yapısının devamında bulunan nesne, bir anlamda `OBJECT_HEADER` yapısı ile örtüşmektedir. Nesne, `OBJECT_HEADER` yapısından sonra olmak yerine yapı içerisinde bulunan **Body** alanından başlamaktadır.

Nesne başlığı referans sayımlarını içeren **HandleCount** ve **PointerCount** alanlarını muhafaza etmektedir. Bu alanlar Nesne Yöneticisi tarafından o nesneye bir referans olduğu müddetçe nesnenin hafızada tutulması için kullanılmaktadır. **HandleCount** alanı nesneye olan toplam tutamak sayısını, **PointerCount** ise nesneye ait olan toplam tutamak ve çekirdek modu referans sayımlarının içermektedir.

Nesne başlığı bazı durumlarda kendinden önce `OBJECT_HEADER_PROCESS_INFO`, `OBJECT_HEADER_QUOTA_INFO`, `OBJECT_HEADER_HANDLE_INFO`, `OBJECT_HEADER_NAME_INFO` ve `OBJECT_HEADER_CREATOR_INFO` gibi bazı isteğe bağlı nesne başlığı bilgi yapılarını içerebilir. **InfoMask** bit maskesi alanı bahsi geçen ek alanlardan hangilerinin kullanılacağına karar veren alandır.

**SecurityDescriptor** alanı SECURIRTY_DESCRIPTOR türüne sahip bir yapıya işaret etmektedir, bu yapı Discretionary Access Control List (DACL) ve System Access Control List (SACL) bilgilerini içermektedir. DACL, nesneye erişim yapan işlemlerin belirteclerini(token) kontrol etmek için kullanılır. SACL ise nesneye olan erişimi denetlemek için kullanılmaktadır.

Çekirdek, nesneleri `PASSIVE_LEVEL` seviyesinden yüksek bir *IRQL* değerinde silemez. *ObpDeferObjectDeletion()* fonksiyonu, gecikmeli olarak silinecek olan nesneleri bir liste olarak birbirine bağlama görevini yerine getirir, bu bağlanan nesneler **ObpRemoveObjectList** değişkeninde tutulur. **NextToFree** alanı da bu amaçla kullanılmaktadır.

**QuotaBlockCharged** alanı **EPROCESS.QuotaBlock**'da bulunan `EPROCESS_QUOTA_BLOCK` yapısına işaret eder, bu yapı *PsChargeSharedPoolQuota()* ve *PsReturnSharedPoolQuota()* fonksiyonları tarafından belirli bir işlemin ne kadar Sayfalanabilir(Paged) ve Sayfalanamaz(NonPaged) havuz kullandığı bilgisini takip etmekte kullanılır. Kota bilgisi daima nesneyi tahsis eden işlem üzerinden yürütülür.

Hata ayıklayıcının "!object" komutu nesne başlığı içerisinde tutulan bilgileri verir. "!obtrace" komutu ise eğer nesne referans takibi aktif ise nesneler için nesne referans takip verisini verir. "!obja" komutu ise herhangi bir nesnenin nesne özellik bilgisi hakkında bilgi verir.

**İlgili Fonksiyonlar** : ObReferenceObject(), ObReferenceObjectByPointer(), ObDereferenceObject()

### nt!_OBJECT_TYPE
Nesne Yöneticisi tarafundan yönetilen her nesne tipi için bir adet 'Tür Nesnesi' yapısı bulunmaktadır, bu yapı tanımladığı nesnenin genel özelliklerini içermektedir. Bu 'Tür Nesnesi' `OBJECT_TYPE` yapısı ile tanımlanmaktadır. Windows 7 itibariyle yaklaşık olarak 42 farklı nesne türü yapısı bulunmaktadır. Bir çekirdek değişkeni olan **ObTypeIndexTable**, her bir nesne türü için bulunan `OBJECT_TYPE` yapılarına işaretçi tutan bir dizidir. Sistemdeki her nesnenin OBJECT_HEADER.TypeIndex alanı, **ObTypeIndexTable** dizisinde bulunan `OBJECT_TYPE` yapılarından birine bir indeks değeri içermektedir. Çekirdek, istemdeki her nesne türü için ayrıca o nesnenin `OBJECT_TYPE` yapısına işaret eden global değişkenler tutmaktadır. Örneğin **nt!IoDeviceObjectType** değişkeni `DEVICE_OBJECT` nesneleri için tanımlı olan `OBJECT_TYPE` yapısını göstermektedir.

`OBJECT_TYPE` yapısının **TypeInfo** alanı, bir `OBJECT_TYPE_INITIALIZER` yapısına işaret eder, bu yapı nesne yöneticisi tarafından nesne üzerinde gerçekleştirilen çeşitli işlemler sırasında çağırılacak olan nesne tipine özel fonksiyonları içerir. 

**CallbackList** alanı sürücü tarafından belirli nesne tipi için eklenen geriçağrımlar(callbacks) listesinin başına işaret eder. Şimdilik geriçağrımları yalnızca işlem ve işlemcik nesneleri **TypeInfo.SupportsObjectCallbacks** alanında belirtildiği üzere desteklenmektedir.

**Key** alanı bu tipte olan nesneler için tahsis edilmiş alanların işaretlenmesinde kullanılacak havuz etiketini(pool tag) içermektedir.

Hata ayıklayıcının "!object \ObjectTypes" sistemdeki tüm tip nesnelerini göstermektedir.

### nt!_HANDLE_TABLE_ENTRY

Windows'da bulunan işlemler, çekirdek sanal adres alanında barındırılan kendi özel tutamak tablolarına sahiptirler. `HANDLE_TABLE_ENTRY` yapısı, işlemin tutamak tablosunda olan her bir girdiyi temsil etmekte kullanılan yapıdır. Tutamak tabloları "paged" havuzundan tahsis edilmektedirler. Bir işlem sonlandırıldığında *ExSweepHandleTable()* fonksiyonu işlemin tutamak tablosunda bulunan tutamakları kapatmakta ve bu tabloyu temizlemektedir.

**Object** alanı oluşturulan belli bir nesne yapısına gösterici içerir, örneğin bu Dosya, Olay(Event) gibi yapılar olabilir.

**GrantedAccess** alanı `ACCESS_MASK` türünde bir bit maskesidir, bu alan tutamağın belirli bir nesne üzerinde gerçekleştirebileceği işlemler hakkında bilgi verir. Bu alanın değeri *SeAccessCheck()* fonksiyonu tarafından belirlenir, değerin belirlenmesi sırasında çağırıcı tarafından istenen izinler (Desired Access) ve kullanılacak olan nesnenin içerisinde tanımlı olan ACE ve DACL verileri kullanılır.

Hata ayıklayıcının "!handle" komutu herhangi bir işlemin tutamak tablosunu incelemek için kullanılabilir. "!htrace" komutu ise eğer tutamak izleme ayarı aktif ise, tutamağın yığın takibi ile ilgili bilgi verir.

**İlgili Fonksiyonlar** : ObReferenceObjectByHandle(), ObReferenceObjectByHandleWithTag().

## Hafıza Yöneticisi

### nt!_MDL

MDL, kullanıcı veya çekirdek hafızasında sayfa kilidine sahip bir alanı tanımlayan hafıza tanımlayıcı liste yapısıdır. Sabit uzunluklu bir başlık ve devamında MDL'in tanımladığı her bir sayfa PFN(Page Frame Numbers)'i için bir değişken numarasından oluşur.

MDL yapısı tanımladığı tampon belleğin sanal adresini ve boyutunu içerir, ayrıca kullanıcı modundaki tamponlar için bu tampona sahip olan işleme işaretçi de içerir. MDL'ler kullanıcı modundaki bir tampon belleği çekirdek modunda eşlemekten(veya tam tersi), aygıt sürücülerinden donanım sürücülerine kadar DMA transferlerini gerçekleştirmek için kullanılarlar.

Windowsta bulunan bazı sürücü türleri (örneğin ağ yığını gibi) zincirlenmiş MDL yapısı sistemini desteklemektedir, bu sistemde birçok MDL aslında parçalı bir halde olan tampon hafıza alanlarını **Next** alanını kullanarak birbirine bağlı bir şekilde saklar.

Kullanıcı modu tamponu tanımlayan MDL'lerde, **Process** alanı tampona sahip olan ve sanal adres alanında kilitleme yapılmış işlemin `EPROCESS` yapısına işaretçi içerir.

Eğer MDL tarafından tanımlanan tampon çekirdek modu sanal adres alanına eşlenmiş ise, **MappedSystemVa** alanı bu tampon için çekirdek modunda kullanılabilecek adresi içerir. Bu alan yalnızca **MdlFlags** alanında bulunan `MDL_MAPPED_TO_SYSTEM_VA` ve `MDL_SOURCE_IS_NONPAGED_POOL` bitleri aktif durumda ise geçerlidir.

**Size** alanı MDL veri yapısını ve devamında bulunan tüm *PFN* dizisinin boyutunu içerir.

**StartVa** ve **ByteOffset** alanları birlikte MDL tarafından kilitlenen orijinal tampon belleğin başlangıç adresini tanımlar. **StartVa** alanı tamponun bulunduğu sayfanın başlangıçına, **ByteOffset** ise tamponun o sayfa içerisindeki asıl başlangıç yerine işaret eder.

**ByteCount** alanı MDL tarafından kilitlenen tamponun uzunluğunu tanımlar. 

**İlgili Fonksiyonlar** : IoAllocateMdl(), IoBuildPartialMdl(), IoFreeMdl(), MmInitializeMdl(), MmSizeOfMdl(), MmPrepareMdlForReuse(), MmGetMdlByteCount(), MmGetMdlByteOffset(), MmGetMdlVirtualAddress(), MmGetSystemAddressForMdl(), MmGetSystemAddressForMdlSafe(), MmGetMdlPfnArray(), MmBuildMdlForNonPagedPool(), MmProbeAndLockPages(), MmUnlockPages(), MmMapLockedPages(), MmMapLockedPagesSpecifyCache(), MmUnmapLockedPages(), MmAllocatePagesForMdl(), MmAllocatePagesForMdlEx(), MmFreePagesFromMdl(), MmMapLockedPagesWithReservedMapping(), MmUnmapReservedMapping(), MmAllocateMappingAddress(), MmFreeMappingAddress()

### nt!_MMPTE

MMPTE, hafıza yöneticisinde, CPU'da bulunan hafıza yönetim biriminin (MMU) sanal adresleri(SA - Virtual Address(VA)) fiziksel adrese(FA- Physical Address(PA)) çevirmek için kullandığı Sayfa Tablo Girdilerini (Page Table Entry - PTE) temsil eden yapılardır. SA-FA dönüşümü sırasında gerekli olan çevirme aşaması temelde CPU'nun tipine bağlıdır. Örneğin x86 işlemciler 2 aşamalı (PDE ve PTE), yine x86 işlemciler PAE modu aktif iken 3 aşamalı(PPE, PDE ve PTE), x64 işlemciler ise 4 aşamalı (PXE, PPE, PDE ve PTE) çevirme aşaması kullanırlar. Farklı seviyelerdeki yapıların (örn PXE, PPE, PDE ve PTE) benzer olmasından dolayı, MMPTE yapıları yalnızca PTE yapıları için değil, diğer yapıların temsil edilmesi için de kullanılabilmektedir.

Esasen MMPTE yapısı, windows hafıza yöneticisinin sayfa hatası(page fault) işleme mekanizmasının PTE tarafından belirtilen sayfanın yerini bulmak için kullanıdığın alt yapılardan oluşan bir birliktir. Örneğin, PTE geçerli bir fiziksel sayfa adresi içeriyorsa ve MMU, PTE'yi adres dönüşümü için kullanabiliyorsa bu durumda **u.Hard** alt yapısı kullanılır.

Sayfa işlemin "working set"inden silindiğinde(trimmed), Windows Hafıza Yöneticisi sayfanın PTE'sini donanım açısından geçersiz(invalid) olarak işaretler ve sözkonusu PTE'yi sayfa hakkında sisteme bağımlı bilgiyle yeniden doldurur. Bunun sonucunda CPU Hafıza Yönetim Birimi (MMU) artık bu PTE'yi adres çevirimi için kullanamaz. Bu tür bir sayfaya erişimi olması durumunda, CPU sonucunda Windows sayfa hata işleyicisinin çağırılacağı bir sayfa hatası oluşturur. PTE içerisinde bulunan bilgi, şimdi sayfayı tekrar bulmak ve işlemin "working set"ine geri getirilmek için kullanılır bu da sayfa hatasını çözer. Bu tür değişimde olan PTE örneği olarak Standby veya modified durumları örnek gösterilebilir. Bu durumda **u.Transition** alt yapısı sayfa hakkında gereken bilgiyi saklamak için kullanılmaktadır.

Fiziksel sayfanın içeriği, sayfa dosyasına(page file) kaydedildiğinde, Windows Hafıza Yöneticisi **u.Soft** alanının kullanılma ihtimaline karşı PTE yapısındaki sayfanın yerini, sayfa dosyasında gösterecek şekilde tekrar günceller. **u.Soft.PageFileLow** alanı sözkonusu sayfanın 16 adet desteklenen sayfa dosyasından hangisinde olduğunu, **u.Soft.PageFileHigh** ise o sayfa dosyası içerisindeki sayfa indeks bilgisini vermektedir.

Hata ayıklayıcının "!pte" komutu verilen sanal adresin tüm sayfa tablosu aşamaları hakkında bilgi verilir.

### nt!_MMPFN

Windows Hafıza Yöneticisi sistemdeki tüm fiziksel sayfaların bilgisini PFN veritabanı denilen bir dizide saklamaktadır. MMPFN yapısı ise bu veritabanı içerisindeki her bir girdi hakkında, ve o girdinin gösterdiği fiziksel sayfa hakkında bilgi içermektedir.

*nt!MmPfnDatabase* değişkeni PFN veritabanını oluşturan MMPN yapılarının dizisine gösterici içermektedir. PFN veritabanında bulunan toplam girdi sayısı nt!MmPfnSize değişkeninde tutulmaktadır. Belleği korumak amacıyla MMPFN yapıları paketlenmektedirler. Yapıdaki alanların yorumlanması farklıdır ve tanımlanan sayfanın o anki durumuna bağlıdır.

Fiziksel sayfanın durumu **u3.e1.PageLocation** alanında saklanmaktadır. Bu durum `nt!_MMLISTS` tiplerinden herhangi biri olabilir.

**u2.ShareCount** alanı sayfaya işaret eden toplam işlem PTE sayısını içerir. Bu sayı paylaşılan sayfalar kullanılması durumunda birden fazla olabilmektedir.

**u3.e2.ReferenceCount** alanı sayfanın kitli olması durumunda kilitlenme sayımını, aksi durumda ise sayfanın referans sayımını tutmaktadır. Bu referans sayısı **u2.ShareCount** alanı sıfır olduğunda 1 azaltılır.

**PteAddress** alanı sözkonusu PFN girdisine işaret eden işleme özel veya prototip PTE yapısını gösterir.

Hata ayıklayıcının "!pfn" komutu verilen fiziksel sayfanın MMPFN yapısı ile ilgi bilgi verir.

### nt!_MMPFNLIST

Hafıza yöneticisi aynı durumda olan fiziksel sayfaları bağlantılı olarak tutar. Bu durum belli bir durumda olan sayfaların(örn: sıfırlanmış sayfalar, boş sayfalar) bulunma hızını arttırır. MMPFNLIST yapısı bu listelerin başını tutmaktadır. Sistemde aynı durumlarda bulunan sayfaları tutan, bu durumlarının her biri için ayrı bir MMPFNLIST yapısı bulunmaktadır. Bunlar nt!Mm<SayfaDurumu>ListHead ismiyle tanımlanmış çekirdek değişkenlerinde saklanmaktadır. Anlaşılabileceği gibi SayfaDurumu kısmı sayfanın durumunu belirtmektedir, örneğin bu alan Standby, Modified, ModifiedNoWrite, Free, Rom, Bad, Zeroed olabilmektedir. Active durumuna sahip olan sayfalar (örneğin bir işlemin "working set"ine ait olan sayfalar) bu listelerden herhangi birinde bulunmazlar.
 
Windows'un yeni sürümlerinde **nt!MmStandbyPageListHead** değişkeni kullanılmamaktadır, bunun yerine standby modunda olan sayfalar **nt!MmStandbyPageListByPriority** içerisinde 8 ayrı öncelik seviyesine göre saklanmaktadır. Benzer bir şekilde **nt!MmFreePageListHead** ve **nt!MmModifiedPageListHead** değişkenleri de artık kullanılmamaktadır, bunun yerine bu tür sayfalar sırasıyla **nt!MmFreePagesByColor** ve **nt!MmModifiedProcessListByColor** veya **nt!MmModifiedPageListByColor** içerisinde tutulmaktadır.

`MMPFN` yapısının **MMPFN.u1.Flink** ve** MMPFN.u2.Blink** alanları, belirli bir sayfayı çift yönlü bağlı liste olarak tutmak için kullanılır. Bu listelerin **Flink** ve **Blink** alanları ilgili `MMPFNLIST` yapılarında saklanmaktadır.

**ListName** alanı numaralandırılmış tipler olan MMLISTS içerisinden biridir, bu değer de listeye bağlanmış olan sayfaların türünü belirtir. 

Hata ayıklayıcının "!memusage 8" komutu belirli durumlarda olan sayfaların sayısını göstermektedir.

### nt!_MMWSL

Windows işletim sisteminde bulunan tüm işlemler kendisine ait "working set" ile ilişkilendirilmiştir, bunlar işlemin erişimi sırasında bir sayfa hatası (page fault) almadan erişebileceği sayfalardan oluşmaktadır. Working Set Trimmer(WST), *KeBalanceSetManager()* fonksiyonunun bağlam alanında çalışan bir hafıza yöneticisi bileşenidir ve görevi işlem tarafından artık kullanılmayan sayfaları işlemin kendi "working set"i içerisinden silip, ihtiyacı olan diğer işlemlere dağıtmaktır. Bu görevi yerine getirebilmek için, WST sistemde çalışan tüm işlemlerin "working set" bilgisini tutmaya ihtiyaç duyar. Bu bilgiler MMWSL yapısı içerisinde tutulurlar. Tüm işlemlerin **EPROCESS.Vm.VmWorkingSetList** alanı, o işlemin `MMWSL` yapısına işaret eder.

Sistemdeki her işlemin MMWSL'i çekirdek modu sanal adres alınının HyperSpace alanına tam olarak aynı adrese eşlenmektedir. HyperSpace, çekirdek sanal adres alanının bir parçasıdır ve her işlemi kapsayan bir adet paylaşılan eşleme olması yerine her işlemde ayrı bir eşlemesi olduğu ayrı bir alana sahiptir. Bu sayede hafıza yöneticisi, herhangi bir örnek zamanda yalnızca şu anki işlemin MMWSL'sine ulaşabilmektedir.

MMWSL yapısının **Wsle** alanı işlemin "working set" liste girdi dizisinin taban değerine işaret eder. Geçerli olan toplam girdi sayısı ise **EPROCESS.Vm.WorkingSetSize** alanında tutulur.
 
### nt!_MMWSLE

`MMWSLE` veri yapısı, işlemin "working set"inde bulunan bir sayfa için "working set" liste girdisini temsil eder, bu durumda `MMWSLE` yapısı işlemin "working set"inde olan her sayfa için ayrı bir tane olmaktadır. Bu veri yapısı, "working set" düzenleyicisi(trimmer) tarafından belirlenen sayfanın, örneğin işlemin "working set"inden silinmeye aday olup olmadığını belirlemek için kullanılmaktadır.

İşlem, kendisinin "working set"inde olan bir sayfaya erişmeye çalıştığında, işlemcinin hafıza yönetim birimi(MMU) ilgili sayfanın PTE'sinde bulunan **MMPTE.Hard.Accessed** bitini tanımlı hale getirir. "Working set" düzenleyicisi belirli aralıklarla çalışıp işlemlerin WSLElerini tarar. Bu periyodik tarama sırasında düzenleyici taradığı sayfanın son taramasından bu yana erişilip erişilmediğini kontrol eder. Eğer sayfa son taramadan bu yana erişilmemiş ise bu sayfanın **u1.e1.Age** alanı arttırılarak sayfanın yaşı yükseltilir. Eğer son taramadan bu yana erişim gerçekleşmiş ise bu alan sıfıra indirilir. **u1.e1.Age** alanı 7'ye ulaştığında bu sayfa düzenleyici tarafından silinmeye aday bir sayfa olarak işaretlenir.

**u1.e1.VirtualPageNumber** alanı `MMWSLE` tarafından temsil edilen sayfanın sanal adresinin yüksek değerli 20 (x86 sistemlerde) 
veya 52bitini(x64 sistemlerde) içerir.

Hata ayıklayıcının "!wsle" komutu belirli bir işlemin "working set" listesi girdilerini görmek için kullanılabilir.

### nt!_POOL_HEADER

Çekirdekteki dinamik hafıza tahsisi, Sayfalanamaz Havuz(NonPaged Pool), Sayfalanabilir Havuz(Paged Pool) veya Oturum Havuzu(Session Pool) kullanılarak yapılabilir. Bu durum tahsis edilecek alanın boyutuyla da ilgilidir, hafıza havuzundan yapılacak tahsis işlemleri küçük havuz tahsisleri(small pool allocations, boyutu <= 4K) ve büyük havuz tahsisleri(large pool allocations, boyutu >= 4K) olarak ikiye ayrılır. Havuzdan yapılacak tahsis işlemlerinde istenilen boyut x86 sistemlerde daima 8 bayt, x64 sistemlerde ise 16 bayta yuvarlanır.

Tüm küçük havuz tahsisleri havuz başlığı(pool header), tahsiscinin veriyi saklamak için kullandığı veri alanı ve hizalama gereksinimlerini karşılamak için birkaç bayt boşluktan oluşmaktadır. Havuz başlığı `POOL_HEADER` yapısı tarafından temsil edilir, ve bu (devamındaki?) yapı ise başlıktan sonra bulunan veri alanı ile ilgili bilgi içerir.

**BlockSize** alanı başlık ve boşluk için kullanılan baytlarla birlikte havuz bloğunun toplam boyutunu verir. **PreviousSize** alanı önceki bloğun(yakında bulunan nümerik olarak daha küçük adrese sahip olan blok) boyutunu gösterir. **BlockSize** ve **PreviousSize** alanlarının her ikisi de x86 sistemlerde 8baytın katı, x64 sistemlerde ise 16baytın katı olarak saklanır. **PoolTag** alanı 4 karakterlik bir etiket içerir, bu etiket havuz tahsisini yapan sorumluyu bulmakta kullanılır, birincil olarak hata ayıklama işlemi sırasında kullanılan bir özeliktir. Eğer havuz etiketinin en yüksek değerli biti (yani 31. bit) işaretli ise, bu havuz tahsisi korumalı olarak işaretlenmiş demektir.

Büyük Havuz tahsisleri, tahsisle birlikte `POOL_HEADER` yapısına sahip değillerdir, bunun yerinde havuz başlıkları **nt!PoolBigTable** denilen ayrı bir tabloda tutulurlar. Büyük havuz tahsislerinin sayfa sınırlamasına(4K) yuvarlanmasından dolayı bu gereklidir.

Hata ayıklayıcının "!pool" komutu belirtilen havuz sayfasında bulunan havuz blokları hakkında bilgi verir. "!vm" komutu havuz kullanımı bilgisini verir. "!poolused" komutu ise tüm havuz etiketleri hakkında ne kadar bayt tüketildiği, ve kaç adet blok tahsis edildiği bilgisini verir. "!poolfind" komutu belirtilen havuz etiketini kullanan havuz tahsislerini gösterir. "!poolval" komutu havuz başlığını bozulmalara karşı test eder, fakat unutulmamalıdır ki asıl havuz verisini kontrol etmez. "!frag" sayfalanamaz havuzdaki dış havuz parçalanma bilgisini verir. 

**İlgili Fonksiyonlar**: ExAllocatePoolWithTag(),ExAllocatePoolWithQuotaTag(), ExFreePool().

### nt!_MMVAD

MMAD yapıları sanal adres tanımlayıcılarını(virtual address descriptors - VADs) temsil eder ve işlemin kullanıcı modu sanal adres alanındaki devamlı(contiguous) sanal hafıza alanlarını tanımlamak için kullanılır. İşlemin herhangi bir bölümünde *VirtualAlloc()* veya *MapViewOfSection()* ile ilerde kullanılması için her sanal hafıza ayırılması sırasında bir adet de `MMVAD` yapısı oluştururlur. `MMVAD`'lar Sayfalanamaz(NonPaged) havuzdan tahsis edilir ve bir AVL ağacı biçiminde düzenlenirler. Her işlem yalnızca kullanıcı modu sanal adres alanını tanımlamak için kullanılan kendi `VAD` ağacına sahiptir, yani çekirdek modu sanal hafıza alanı için `VAD` yapıları yoktur. 

**StartingVpn** ve **EndingVpn** alanları *VAD* tarafından tanımlanan alanın yüksek anlamlı 20bitini(x86 için) veya 52 bitini(x64 için) içerir, bu bilgi ise başlangıç ve bitiş adreslerini verir. **LeftChild** ve **RightChild** alanları, *VAD* ağacındaki sonraki düşük seviye düğüme(node) işaret eder.

Hata ayıklayıcının "!vad" komutu işlemin `VAD` yapısı hakkında bilgi verir.

**İlgili Fonksiyonlar** : ZwAllocateVirtualMemory(), ZwMappedViewOfSection(), MmMapLockedPagesSpecifyCache()

## Önbellek Yöneticisi (Cache Manager)

### nt!_VACB

Sistem önbellek sanal adres alanı *256K* uzunlukta(ntifs.h dosyası içerisinde `VACB_MAPPING_GRANULARITY` sabiti ile tanımlanır) ve "views" ismi verilen parçalara ayrılmıştır. Bu sayı aynı zamanda sistem önbelleğine eşlenecek olan dosyaların hangi hizalama ve uyum bilgisine sahip olmasını gerektiğini de belirtir. Tüm "view"lar için önbellek yöneticisi Sanal Adres Kontrol Bloğu(Virtual Address Control Block (VACB)) ismi verilen ve sözkonusu "view" hakkında bilgi içeren yapılar sağlamaktadır.

**CcNumberOfFreeVacbs** ve **CcNumberOfFreeHighPriorityVacbs** isimli iki global çekirdek değişkeni birlikte toplam tahsis için uygun halde olan `VACB` sayısını belirler. Benzer tüm `VACB` yapıları **CcVacbFreeList** ve **CcVacbFreeHighPriorityList** isimli listelerde korunur. Links alanı da bu amaçla kullanılır.

**BaseAddress** alanı `VACB` tarafından tanımlanan "view"'in sistem önbelleğindeki başlangıç adresine işaret eder, bu bilgi ise *MmMapViewInSystemCache()* fonksiyonu tarafından oluşturulur.

**SharedCacheMap** alanı, ilgili `VACB` yapısınına sahip olan paylaşılan önbellek haritası(shared cache map) yapısına işaretçi içerir.

**ArrayHead** alanı `VACB`'ı içeren `VACB_ARRAY_HEADER` yapısına işaret eder.

Hata ayıklayıcının "!filecache" komutu kullanımda olan `VACB` yapıları hakkında bilgi verir.

### nt!_VACB_ARRAY_HEADER

`VACB` yapıları, VACBlerin yönetimini sağlayan başlık olarak `VACB_ARRAY_HEADER` eşliğinde 4095 adet olarak tahsis edilir. `VACB_ARRAY_HEADER` yapısının hemen peşinde `VACB` yapıları dizisi bulunur.

Bir birim `VACB` dizisinin boyutu 128K'ya denk gelmektedir, bu da `VACB_ARRAY_HEADER` yapısını ve 4095 adet onu takip eden `VACB` yapısını kapsamaktadır. Böylece her bir birim 1023MB'a kadar sistem önbellek sanal adresi eşleyebilir (bir adet `VACB` 256K eşleyebilir). En fazla olabilecek `VACB_ARRAY_HEADER` yapısı ve bunun içinde bulunacak `VACB` yapılarının sayısı sistemdeki toplam sistem önbellek sanal adres alanı ile ilgilidir, örneğin x64 sistemlerde bu 1TB x86 sistemlerde ise 2GB olabilmektedir. Bu durumda x86 sistemlerde aynı anda en fazla 2 adet `VACB_ARRAY_HEADER` yapısı bulunabilmektedir.

Bir çekirdek değişkeni olan *CcVacbArrays* `VACB_ARRAY_HEADER` yapılarına işaret eden bir gösterici dizisidir. **VacbArrayIndex** alanı, sözkonusu `VACB_ARRAY_HEADER` yapısının *CcVacbArrays* dizisindeki yerini veren gösterge numarasıdır. *CcVacbArraysHighestUsedIndex* değişkeni, *CcVacbArrays* dizisindeki en son kullanılan girdiyi içerir. Bu dizi ise *CcVacbSpinLock* isimli kuyruklanmış döneç kilit(queued spin lock) ile korunur.

Tüm sistemde tahsis edilmiş ve **CcVacbArrays** ile gösterilen toplam `VACB_ARRAY_HEADER` yapısı sayısı **CcVacbArraysAllocated** isimli global bir değişkende saklanır.

### nt!_SHARED_CACHE_MAP

`SHARED_CACHE_MAP` yapısı önbellek yöneticisi tarafından o an sistem önbellek sanal adres alanına önbelleğe alınmış olan dosyanın
bölümleri hakkında bilgi saklamak için kullanılır. Önbelleklenmiş bir dosya için, o dosyanın açık olan tüm örneklerini de içine alan bir adet `SHARED_CACHE_MAP` yapısı bulunur. Yani, `SHARED_CACHE_MAP` yapısı dosyanın açık olan örnekleri ile ilgili olmak yerine direkt olarak dosyanın kendisi ile ilgilidir. Belirli bir dosyanın açık örneklerini temsil eden tüm FILE_OBJECT yapıları SectionObjectPointers.SharedCacheMap alanı ile aynı `SHARED_CACHE_MAP` yapısına işaret ederler.

Aynı dosya akışı bölümlerini eşleyen tüm `VACB` yapıları, yine aynı `SHARED_CACHE_MAP` yapısını kullanarak erişilebilir durumdadır. Paylaşılan önbellek haritası yapıları, dosyanın belirli bir bölümünün önbellekten birden fazla eşlemeye sahip olmayacağını garanti etmektedir.

Global bir değişken olan **CcDirtySharedCacheMapList**, "view"lerinde "dirty" veri içeren tüm `SHARED_CACHE_MAP` yapılarını tutan bir listedir. Bu listenin içerisinde özel bir girdi bulunmaktadır (global bir değişken olan **CcLazyWriterCursor**), bu değişken tembelce yazılacak olan `SHARED_CACHE_MAP` yapılarının başlangıcını göstermektedir. **CcLazyWriterCursor**, tembel yazıcı(lazy writer) her çalıştığında **CcDirtySharedCacheMapList** listesi içerisinde hareket etmektedir. Herhangi bir "dirty" sayfaya sahip olmayan "view"lere sahip `SHARED_CACHE_MAP` yapıları global bir bağlı liste olan **CcCleanSharedCacheMapList** içerisinde tutulur. **SharedCacheMapLinks** alanı, `SHARED_CACHE_MAP` yapılarını **CcCleanSharedCacheMapList** veya **CcDirtySharedCacheMapList** listelerine sıraya koymak için kullanılmaktadır.

**SectionSize** alanı `SHARED_CACHE_MAP` tarafından eşlenmiş olan bölümün boyutunu belirler.

**InitialVacbs** alanı 1MB'dan daha küçük dosya bölümlerini eşitlemek için kullanılan 4 adet `VACB` içeren bir dizidir. Eğer bölüm boyutu 1MB'ı geçiyorsa, 128 adet `VACB` göstericisini içeren bir dizi tahsis edilerek Vacb alanlarında artık 32MB'a (yani 128 * 256K) kadar olan dosyaları tanımlayabilecek `VACB`lar gösterilir. Eğer bölümün boyutu 32MB'ı geçiyorsa, bu durumda 128 girdi içeren dizinin her bir üyesi, başka bir 128 adet `VACB` girdisi içeren dizilere gösterici olurlar. Bu ek seviye 4GB'a (yani 128 * 128 * 256K) kadar olan bölümleri destekler. En fazla 7 seviyeye çıkabilen `VACB` yapıları sayesinde teoride (128^7 * 256K) boyutunda olan dosyalara kadar izin verilmektedir, fakat bu boyut önbellek yöneticisi tarafından desteklenen en büyük bölüm boyutunu(2^63) aşmaktadır.

*CcCreateVacbArray()* fonksiyonu `VACB` dizilerini oluşturur ve bu `VACB` dizileri **VacbLock** alanında tutulan "push" kilidi ile korunur.

**PrivateList** alanı, bir dosyanın açık olan tüm örnekleri ile ilişkilendirilmiş olan PRIVATE_CACHE_MAP yapılarının bağlı listesinin en başını tutmaktadır. **PRIVATE_CACHE_MAP.PrivateLinks** alanı liste içerisindeki yapıları birbirine bağlamak için kullanılmaktadır.

Hata ayıklayıcının "!fileobj" komutu içerisinde `SHARED_CACHE_MAP` yapısına gösterici içeren `SECTION_OBJECT_POINTER` yapıları hakkında bilgi vermektedir.

### nt!_PRIVATE_CACHE_MAP

Önbellek yöneticisi performansı artırmak için bir dosya üzerinde ileriye dönük okuma gerçekleştirir. Bu ileriye dönük okuma işlemleri belirli bir dosyanın her açık örneği üzerinde bağımsız bir şekilde yapılmaktadır. Bir dosyanın açılmış her örneği ile ilişkilendirilmiş olan `PRIVATE_CACHE_MAP` yapısı, en son yapılan birkaç okumanın geçmişini ve bunların önbellek yöneticisi tarafından o dosya üzerinde ileriye dönük okumada kullanılıp kullanılmadığı bilgisini tutmaktadır.

**FILE_OBJECT.PrivateCacheMap** alanı açık olan dosya örneği ile ilişkilendirilmiş `PRIVATE_CACHE_MAP` yapısını göstermektedir. Bu alan bu dosya için önbellekleme aktif edildiği sırada *CcInitailizeCacheMap()* fonksiyonu ile belirlenmekte, önbellekleme kapatıldığında ise *CcUninitializeCacheMap()* fonksiyonu ile temizlenmektedir.

**FileObject** alanı, `PRIVATE_CACHE_MAP` yapısı ile ilişkilendirilmiş `FILE_OBJECT` yapısına işaret etmektedir. İleriye dönük okuma(Read ahead) işlemleri yalnızca **FILE_OBJECT.Flags** alanı `FO_RANDOM_ACCESS` bitini içermediğinde gerçekleşebilmektedir.

**SHARED_CACHE_MAP.PrivateList** alanı belirli bir dosyanın açık olan her örneği için var olan `PRIVATE_CACHE_MAP` yapılarına işaret etmektedir. Açık olan dosya örneğine ait `PRIVATE_CACHE_MAP` yapıları bu listeye **PrivateLinks** alanı ile eklenilmektedir.

**FileOffset1**, **FileOffset2**, **BeyondLastByte**, **BeyondLastByte2** alanlarının kombinasyonu söz konusu `FILE_OBJECT` yapısı ile dosya üzerinde yapılmakta olan okumanın modelini belirlemek için kullanılır. Önbellek yöneticisi fonksiyonu olan *CcUpdateReadHistory()* her okuma işleminde bu sayaçları güncellemek için çağrılır.

**Flags.ReadAheadEnabled** alanı dosyanın açık olan örneği için yapılacak olan ileriye dönük okuma işlemlerinin zamanlanması gerektiği bilgisini verir. *CcScheduleReadAhead()* tarafından işaretlenen **Flags.ReadAheadActive** alanı **ReadAheadWorkItem** alanında bulunan okuma işçi rutininin(read worker routine) şu anda aktif olduğu bilgisini verir.

Windbg hata ayıklayıcısının "!fileobj" komutu `PRIVATE_CACHE_MAP` hakkında bilgi gösterir.

**İlgili Fonksiyonlar**: CcInitailizeCacheMap(), CcUninitailizeCacheMap(), CcIsFileCached()

### nt!_SECTION_OBJECT_POINTERS

`SECTION_OBJECT_POINTERS` yapısı dosya nesnesi ile ilişkilidir, ve belirli bir dosya ile ilgili dosya eşleme ve önbellekleme ile ilgili bilgileri vermektedir. Bir dosya 2 adet ayrı eşlemeye sahip olabilir, biri çalıştırılabilir dosya veya diğeri veri dosyası olarak..

**DataSectionObject** alanı bir kontrol alanına işaret etmektedir, bu yapı hafıza yöneticisi ile dosya sistemi arasında bir bağlantı sağlamaktadır.

**ImageSectionObject** alanı hafızaya eşlenmiş çalıştırılabilir dosyalar için kullanılan başka bir kontrol alanına işaret etmektedir.
Veri eşleme bir tane devamlı ve aynı koruma özelliklerine sahip bir VA'dan oluşmakta olsa da, bir "image" eşleme farklı koruma özelliklerine sahip aralıklarda çalıştırılabir dosyanın çeşitli bölümlerini eşlemeye izin vermektedir.

**SharedCacheMap** alanı dosya için olan `SHARED_CACHE_MAP` yapısına işaret etmektedir. Bu yapı ise dosyanın nerelerin nerede önbelleğe alındığını belirtmektedir.

`SECTION_OBJECT_POINTERS` yapısında bulunan alanlar, yukarıda da bahsedildiği gibi hafıza yöneticisi tarafından belirlenmekte ayrıca Dosya Sistemi Sürücüleri de `SECTION_OBJECT_POINTERS` yapılarını dosya nesneleri ile ilişkilendirmektedir.

**İlgili Fonksiyonlar**: CcFlushCache(), CcPurgeCacheSection(),CcCoherencyFlushAndPurgeCache(), MmFlushImageSection(), MmForceSectionClosed(), MmCanFileBeTruncated(), MmDoesFileHaveUserWritableReferences(), CcGetFileObjectFromSectionPtrsRef(), CcSetFileSizes()
