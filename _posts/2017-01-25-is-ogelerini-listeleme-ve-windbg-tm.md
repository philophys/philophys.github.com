---
title: İş Öğelerini Listeleme ve Windbg TM
---

Selamlar

Bu yazıda Windows işletim sistemindeki iş öğelerinin (work items) nasıl bulunabileceği üzerinden birkaç şey anlatmak istiyorum. Bahsedeceklerimiz arasında Windbg eklentilerini kurcalama, dışa aktarılmamış bir değişkeni bulma, tek işlemcili sistemlerde eşzamanlama gibi konular var. Normal şartlar altında bildiğim kadarıyla bu iş öğelerini bir yerden listeleyemiyoruz. Bu nedenle de eğer ihtiyacımız olursa, kendimiz bir yöntem bulup bir şekilde listelememiz gerekiyor. Peki nerden çıktı bu derseniz, ileride ortaya çıkarmayı hayal ettiğim bir "şey" için bu öğelerin listelenmesi gerekti geçenlerde, bu yazı da "hmm, nasıl listeleyecem bunları?" sorusunun, benim ulaşabildiğim cevabı niteliğinde...

Hatrınızda kaldı ise önceki yazılardan [birinde](/posts/windows-cekirdegindeki-temel-yapilar) iş öğelerinden bahsetmiştik. Bu yazının da konusu işte bu bahsettiğimiz iş öğelerini listeleme olacak. Yani biraz tersine mühendislik biraz da geliştirme yapacağız. 

## İş öğelerini anımsama
Neydi bu iş öğeleri? Esasen sistem işlemciklerine (*system threads*) benzeyen, fakat altyapısında kendilerine ait işlemcik nesneleri *olmayan* yardımcılardı. Bunların işlenmesi için bir kuyruğa ekleniyorlardı, ve bazı sistem işlemcikleri belirli durumlarda bu iş öğelerini çalıştırıyordu. Kuyrukların ise farklı isimleri vardı, biri çok önemliydi, biri gecikebilirdi, biri de mesela aşırı önemli gibi kuyruklardı.

Önceleri (yanlış bilmiyorsam Windows 2000'e kadar) bu iş öğeleri tek bir biçimde sunuluyordu, o da `WORK_QUEUE_ITEM` idi. Fakat Windows 2000'den sonra eski biçimde bulunan kritik bir sorunu gidermek için yeni bir iş öğesi biçimi daha eklendi, bu ise `IO_WORKITEM` olarak adlandırıldı. Peki bu önemli sorun neydi?

`WORK_QUEUE_ITEM` kullanıldığı zaman, oluşturulan iş öğesinin, onu oluşturan sürücü ile ilişkisi belirsizdi. Bu birinci nesil diyebileceğimiz yapı şöyle:

    typedef struct _WORK_QUEUE_ITEM {
        LIST_ENTRY List;
        PWORKER_THREAD_ROUTINE WorkerRoutine;
        PVOID Parameter;
    } WORK_QUEUE_ITEM, *PWORK_QUEUE_ITEM;

Burada iş öğelerini birbirine bağlayan bir **List**, çalışacak olan fonksiyonu belirleyen **WorkerRoutine**, ve bu fonksiyona gidecek olan **Parameter** elemanları bulunuyordu. Bu yapı kullanıcı tarafından doldurulduktan sonra `ExQueueWorkItem` fonksiyonu ile sistemde bulunan belirli iş öğesi kuyruklarından birine ekleniyordu. Fakat, dediğim gibi burada iş öğesini oluşturan sürücü işin içinde olmadığı için (referans açısından), eğer sürücü bu iş öğesi işini bitirmeden önce kaldırılırsa, iş öğesinin kod kısmı da hafızadan kaldırılacağı için çalışmıyordu.

Buna çözüm olarak dediler ki, iş öğesini oluştururken `ObReferenceObject` kullanarak sürücü nesnesine fazladan bir referans ekleyelim, iş öğesi çalıştığında ise `ObDereferenceObject` kullanarak bu referansı da geri alırız, böylece sorun da çözülmüş olur. Teorik olarak bu yaklaşım doğru olsa da ortada küçük bir sorun oluyor. O da şu, sürücüdeki referans kaldırıldığında eğer sürücü derhal hafızadan kalkarsa `ObDereferenceObject` çalıştıktan sonra çalışacak birkaç makine kodu da yine hafızadan kalkıyor ve üstteki sorun yine devam ediyordu aslında, bu çözüm ile sadece bu bahsi geçen ana sorun biraz daha nadir ortaya çıkıyordu.

İşte bu nedenle bu işin çekirdek tarafından yapılması gerektiği sonucuna ulaşıp iş öğelerine bir ek yaptılar. Bunun için de sisteme yeni bir yapı eklendi o da şöyle:

	typedef struct _IO_WORKITEM {
		WORK_QUEUE_ITEM WorkItem;
		PIO_WORKITEM_ROUTINE Routine;
		PDEVICE_OBJECT IoObject;
		PVOID Context;
		ULONG Type;
	} IO_WORKITEM;

Bu yapıda hemen göze çarpan şey artık iş öğesini oluşturan sürücüye ait nesneye de bir gösterici olmasıydı (**IoObject**). Bu göstericideki nesne, iş öğesi oluşturulduğunda referans sayısı arttırılıyor, iş öğesi çalıştıktan **sonra** ise bu referans kaldırılıyordu. Bence çok güzel bir çözüm. Fakaaat, bu defa da bize minicik bir sıkıntı çıkıyor.

Şimdi, iki ayrı yapıda iş öğesi olmasına rağmen bunlar aynı kuyruklara ekleniyorlar. Biz bu kuyruğu incelerken hangisinin yeni hangisinin eski olduğunu nasıl ayırt edeceğiz? Buna aşağıda değineceğim, oldukça kolay bir şekilde olduğunu söyleyebilirim. Sadece yukarıdaki yapıya dikkatli bakınız.

## Nasıl listeleyeceğiz bu iş öğelerini?
İşte en çok eğlendiğim kısım burası. Çünkü ortada bilinmeyen bir şey var ve onu açığa çıkarmaya çalışıcaz. Öncelikle kod yazmadan önce kafamda bir fikir oluşturmam gerektiği için açtım *Windbg*'yi ve başladım Windows 7'yi incelemeye. Başlarda kendim birkaç kritik sistem yapısında gezindim buralarda ne var, ulaşabilir miyiz diye fakat cevap çok daha farklı bir yerden geldi (Aslında önceki yazıdan nerede olduğunu biliyordum, fakat sağı solu kurcalamak her zaman daha eğlenceli geliyor). Windbg'nin yardım belgelerinde gezerken `!exqueue` isimli bir komutun olduğunu hatırladım. Normal şartlar altında bu komutu çalıştırdığınızda şöyle bir çıktı veriyor:

    kd> !exqueue
    **** Critical WorkQueue ( Threads: 5/512, Concurrency: 0/1 )
    THREAD 852115d8  Cid 0004.0018  Teb: 00000000 Win32Thread: 00000000 WAIT
    THREAD 85211300  Cid 0004.001c  Teb: 00000000 Win32Thread: 00000000 WAIT
    THREAD 851ff020  Cid 0004.0020  Teb: 00000000 Win32Thread: 00000000 WAIT
    THREAD 851ffd48  Cid 0004.0024  Teb: 00000000 Win32Thread: 00000000 WAIT
    THREAD 851ffa70  Cid 0004.0028  Teb: 00000000 Win32Thread: 00000000 WAIT

    **** Delayed WorkQueue ( Threads: 8/512, Concurrency: 0/1 )
    THREAD 851ff798  Cid 0004.002c  Teb: 00000000 Win32Thread: 00000000 WAIT
    THREAD 851ff4c0  Cid 0004.0030  Teb: 00000000 Win32Thread: 00000000 WAIT
    THREAD 85200020  Cid 0004.0034  Teb: 00000000 Win32Thread: 00000000 WAIT
    THREAD 85200d48  Cid 0004.0038  Teb: 00000000 Win32Thread: 00000000 WAIT
    THREAD 85200a70  Cid 0004.003c  Teb: 00000000 Win32Thread: 00000000 WAIT
    THREAD 85200798  Cid 0004.0040  Teb: 00000000 Win32Thread: 00000000 WAIT
    THREAD 852004c0  Cid 0004.0044  Teb: 00000000 Win32Thread: 00000000 WAIT
    THREAD 85fcbb08  Cid 0004.00b4  Teb: 00000000 Win32Thread: 00000000 WAIT

    **** HyperCritical WorkQueue ( Threads: 1/512, Concurrency: 0/1 )
    THREAD 85202020  Cid 0004.0048  Teb: 00000000 Win32Thread: 00000000 WAIT

Burada işçi öğelerini işleyen işlemcikleri görüyoruz esasen görmeyi beklediğim ise işçi öğelerini görmekti. Muhtemelen şu an sistemde bir iş öğesi ekli olmadığı için çıktıyı alamadık, fakat zaten bizi asıl ilgilendiren şey bu komutun bu işçi kuyruklarını listeliyor olması. Demek ki bu komutun kaynak kodu elimizde olsa işi çözeriz. O halde neden komutun nasıl çalıştığını incelemeyelim? Bunun için öncelikle bu komutun hangi dosya içerisinde olduğunu bulmamız gerekiyor. Bunu yapmak için Windbg'nin bulunduğu klasördeki tüm DLL dosyalarının içinde muhtemelen işimize yarayacak bir kelime olan "*ExWorkItem*"i arattım:

    bek@bb C:\Program Files (x86)\Windows Kits\10\Debuggers\x86
    > strings2 -n 5 -s *.dll | grep -i exworkitem
    C:\Program Files (x86)\Windows Kits\10\Debuggers\x86\winxp\kdexts.dll: PENDING: ExWorkItem (%p) Routine %s+0x%p (%p) Parameter (%p)
    C:\Program Files (x86)\Windows Kits\10\Debuggers\x86\winxp\kdexts.dll: PENDING: ExWorkItem (%p) Routine %s (%p) Parameter (%p)
    C:\Program Files (x86)\Windows Kits\10\Debuggers\x86\winxp\kdexts.dll:     ExWorkItem (%p) Routine %s+0x%p (%p) Parameter (%p)
    C:\Program Files (x86)\Windows Kits\10\Debuggers\x86\winxp\kdexts.dll:     ExWorkItem (%p) Routine %s (%p) Parameter (%p)

Aha! `kdexts.dll` içerisinde bir şeyler var belli ki. Bu dosyayı açıp incelediğimde `exqueue` isimli fonksiyonun bu listeleme işini yaptığını fark ettim. Hatta dahası, bu iş öğelerinin listelenmesi sırasında iki farklı yol izlediğini gördüm. Meğersem bu yollardan biri Windows 8 ve sonrasında çalışan ayrı bir yolmuş, çünkü Windows 8'den sonra yapı biraz değişmiş. Anlayacağınız aşağıdaki yöntem bu sürüm(Windows 8) ve yukarısında muhtemelen çalışmayabilir. Fakat çok da bir fark yok, o sürüm için olanı da basitçe geliştirilebilir.. Devam edersek, bizim sistemimiz için kullanılan yöntemi incelediğimde bir global dizi değişkenine ulaşıldığını gördüm, ki bunun aradığım şey olduğu hem isminden hem de önceki yazıda bahsetmiş olmamdan belliydi:

![](/files/kuyrukListelemeDegisken.png)

Burada tahminimce `lpGetExpressionRoutine` fonksiyonu ile ihtiyaç olan sembol bulunuyor. Bu sembol bulunduktan sonra ise diğer bir fonksiyon
olan `DumpQueues7`(diğer listeleme yönteminde çağırılan fonksiyon `DumpQueues8`, yani işletim sistemi isminden esinlenilmiş belli ki) çağırılıyor.

Bu fonksiyon, sistemdeki 3 ayrı kuyruk için 3 kere `DumpQueue` fonksiyonunu çağırıyor. Her seferinde diğer kuyruğu bu fonksiyona argüman olarak vererek. Diğer kuyruğa ulaşmak için (hatırlayın bu bir diziydi), `EX_WORK_QUEUE` yapısından yararlanıyor, yani n. kuyruğa ulaşmak için `TabanAdresi + n * sizeof(EX_WORK_QUEUE)` formülünü kullanıyor. Bu arada kuyruklar ise `KQUEUE` yapısı ile tanımlanmışlar ve bu yapıdaki `EntryListHead` elemanı bize söz konusu kuyruktaki işçi öğelerini veren bağlı listenin en başını veriyor.

Sonrasında ise geriye sadece bu kuyruğu bağlı liste kullanarak gezip, içeride bulunan iş öğelerini yazdırmak kalıyor. Burda şuna dikkat etmek gerekiyor, eğer iş öğesi ikinci nesil ise ne yapacağız? Esasında ikinci de olsa birinci de olsa listeye sadece birinci neslin yapısı ekleniyor (`WORK_QUEUE_ITEM`) fakat şu farkla, eğer ikinci nesil bir iş öğesi ise bu yapının **Parameter** elemanı bize `IO_WORKITEM` yapısını veriyor. Tabi, **Parameter** elemanı birinci nesil iş öğesi oluşturulduğunda geliştirici tarafından da verilebilir, bunu doğrulamak için **Parameter** elemanını `WORK_QUEUE_ITEM` olarak varsayıp (çünkü `IO_WORKITEM` yapısının en başı o zaten), burayı kuyruktan aldığınız
`WORK_QUEUE_ITEM` ile karşılaştırabiliriz, eğer tutuyorsa demek ki bu bir `IO_WORKITEM`, yani ikinci nesil bir iş öğesi demektir, eğer tutmuyorsa birinci neslin kendi parametresi, yani bu da bir birinci nesil iş öğesi demektir.

## Teorik test
Az çok yapıyı anladığımıza göre Windbg üzerinden doğrulayalım:

    kd> dd nt!ExWorkerQueue l1
    82b7d580  000a0004
    kd> dt nt!_EX_WORK_QUEUE 82b7d580
       +0x000 WorkerQueue      : _KQUEUE -> bu lazım bize
       +0x028 DynamicThreadCount : 0
       +0x02c WorkItemsProcessed : 0x5e9
       +0x030 WorkItemsProcessedLastPass : 0x5e3
       +0x034 QueueDepthLastPass : 0
       +0x038 Info             : EX_QUEUE_WORKER_INFO
    kd> dt nt!_KQUEUE 82b7d580 -> (0. kuyruk)
       +0x000 Header           : _DISPATCHER_HEADER
       +0x010 EntryListHead    : _LIST_ENTRY [ 0x82b7d590 - 0x82b7d590 ]
       +0x018 CurrentCount     : 0
       +0x01c MaximumCount     : 1
       +0x020 ThreadListHead   : _LIST_ENTRY [ 0x852116f8 - 0x851ffb90 ]
    kd> dt nt!_KQUEUE 82b7d580 + 1 * @@c++(sizeof(_EX_WORK_QUEUE)) -> sonraki (1.) kuyruğa geçiyoruz
       +0x000 Header           : _DISPATCHER_HEADER
       +0x010 EntryListHead    : _LIST_ENTRY [ 0x82b7d5cc - 0x82b7d5cc ]
       +0x018 CurrentCount     : 0
       +0x01c MaximumCount     : 1
       +0x020 ThreadListHead   : _LIST_ENTRY [ 0x851ff8b8 - 0x85fcbc28 ]

Burada ne yaptık? Öncelikle ihtiyacımız olan dizinin adresini aldık. Sonra bu dizideki her eleman `EX_WORK_QUEUE` yapısında olduğundan ve bu yapının da ilk elemanının `KQUEUE` yapısı olmasından dolayı ilk iki kuyruğa baktık, ama normal şartlar altındayız diye gördüğünüz gibi bir girdi yok. Bunu nasıl anladık? İş öğeleri `KQUEUE` yapısının `EntryListHead` elemanı kullanılarak birbirine bağlanır, buraya baktığınızda bu eleman kendini gösteriyor. İşte bu da demektir ki listede eleman yok.

## ExWorkerQueue dizi adresinin bulunması
Yukarıda bahsettiğimiz gibi, kuyrukları işaret eden `ExWorkerQueue` dizisi dıştan direkt erişime açık değil. Bu nedenle adresini elde etmemiz gerek. Bu tarz durumlardaki en sık kullanılan yöntem adresi bulunacak olan değişkenin kullanıldığı bir yeri tespit edip, oradan değişkenin adresini almaktır. Bu nedenle ilk işim bu diziyi kullanan yerlere bakmak oldu:

![](/files/exworkerqueuebulma.png)

Birkaç fonksiyon var, bunlardan herhangi birini seçebiliriz. Ben en baştaki `ExQueueWorkItem` fonksiyonunu seçtim. Fonksiyonun ihtiyacımız olan dizi ile ilgili kısmı şöyle:

    82aaa684 57              push    edi
    82aaa685 81c680d5b782    add     esi,offset nt!ExWorkerQueue (82b7d580)
    82aaa68b 50              push    eax
    82aaa68c 8bc6            mov     eax,esi
    82aaa68e e8bf50fdff      call    nt!KiInsertQueue (82a7f752)

Buradan dizinin adresini çekmek için öncelikle sırasıyla `57`, `81` ve `c6` değerlerini bulmalıyız. Burada 3 tane değeri karşılaştırmam sadece kesin emin olmak için, gerekirse daha uzun veya yetiyorsa daha kısa karşılaştırma da elbet yapılabilir. Yani belki de burada `57`, `81` ve `c7` geldi diyelim, o zaman yanlış bir kodu incelediğimizi anlayacağım böylece. Bu 3 değerden sonraki 4 baytlık kısım ise aradığımız
adres olacak.

Bu bilgiler ışığında şöyle bir kod parçası yazmak işimizi ziyadesiyle görecektir:

    PVOID ExWorkerQueueBul(void)
    {
        USHORT i;
        PVOID ExWorkerQueueA = NULL;
        unsigned char* p = (unsigned char*)&ExQueueWorkItem;

        //
        // 60 baytlık bir yeri tarıyoruz, aslında bu kadar bile yoktu
        // sanırım ama bakmaya üşendim
        //
        for (i = 0; i < 60; i++)
        {
            /*
             * 82aaa684 57              push    edi
             * 82aaa685 81c6 80b5b782   add     esi, offset nt!ExWorkerQueue (82b7b580)
             */
            if ((p[i] == 0x57) && (p[i + 1] == 0x81) && (p[i + 2] == 0xc6))
            {
                //
                // Bu üçlü geldiğinde, aradığımız adres 
                // bunların hemen sonrasındaki 4 baytlık 
                // yer olacak.
                //
		ExWorkerQueueA = *(PVOID *)(p + i + 3);
		DbgPrint("ExWorkerQueue adresi tespit edildi: %x \n", ExWorkerQueueA);
                break;
            }
        }
        
        return ExWorkerQueueA;
    }

Böylece aradığımız adresi elde etmiş olduk. Şimdi bu dizideki iş öğelerini listeleme aşamasına geçebiliriz.

## İş öğelerinin listelenmesi
Listeleme aşaması da oldukça basit. Yapıyı bildiğimize göre tek yapmamız gereken bize verilen dizideki kuyrukları, ve o kuyruklar içerisindeki iş öğelerini gezmek. İç içe iki döngü işimizi görür gibi gözüküyor:

    USHORT i;
	WORK_QUEUE_TYPE wType = CriticalWorkQueue;
	for (; wType < NormalWorkQueue; wType++)
	{
		i = 1;
		sonraki = ExWorkerQueueA[wType].WorkerQueue.EntryListHead.Flink; // n. kuyruğun ilk elemanı
		while (sonraki && sonraki != (PLIST_ENTRY)&ExWorkerQueueA[wType].WorkerQueue.EntryListHead) // başa dönmedik di mi? / girdi var mı?
		{
			//
			// Evet, varmış. O zaman bağlı listeden incelenecek elemanı al
			// ve görmek istediklerimizi göster!
			//
			IsOgesi = CONTAINING_RECORD(sonraki, WORK_QUEUE_ITEM, List);
            DbgPrint("%-2d WorkQueueItem: [%p] (%s) Fonksiyon: [%p] Parametre: [%p] \n",
				     i, IsOgesi, IsOgeTipleri[wType], IsOgesi->WorkerRoutine, IsOgesi->Parameter);

			// Sonraki iş öğesine geçelim
			sonraki = sonraki->Flink;
			i++;
		}
	}

`IsOgeTipleri` dizisi şöyle :

    static char* IsOgeTipleri[3] = {
        "Kritik",       //Critical
        "Gecikmeli",    //Delayed
        "Acayip Kritik" //HyperCritical hehe
    };

İkinci nesil bir iş öğesi kullanılırsa ve eğer bununla ilgili ek bilgileri de listelemek isterseniz yukarıda kısaca bahsettiğim yöntemi de uygulamanız gerekebilir. Bunun için de koda(DbgPrint yapıldığı satırın yerine) fazladan şu ufak kodun eklenmesi sanıyorum yeterli:

			//
			// Bak bakalım bu birinci nesil mi ikinci nesil mi?
			//
			if(IsOgesi == (PWORK_QUEUE_ITEM)IsOgesi->Parameter)
			{
				//
				// İkinci nesil bir iş öğesi geldi
				//
				DbgPrint("%d. (%s) IoQueueItem: [%p] (Sürücü : %x) Rutin: [%p] Parametre: [%p] \n",
					     i, IsOgeTipleri[wType], IsOgesi->Parameter, ((PIO_WORKITEM)IsOgesi->Parameter)->IoObject, IsOgesi->WorkerRoutine, IsOgesi->Parameter);
			}
			else
			{
				//
				// Birinci nesil bir iş öğesi geldi
				//
				DbgPrint("%d. (%s) WorkQueueItem: [%p] Rutin: [%p] Parametre: [%p] \n",
				         i, IsOgeTipleri[wType], IsOgesi, IsOgesi->WorkerRoutine, IsOgesi->Parameter);
			}

## Kritik yapıya erişimde kilitleme 

Son ama önemli olarak şunu da ekleyelim. `ExWorkerQueue` dizisine eriştiğimiz sırada bir tek biz erişmiyoruz. Böyle düşünemeyiz. Aynı zamanda
mesela işletim sistemi de bu diziye erişiyor. Çünkü o kuyrukların işlenmesi gerek. Veya meselam başka bir sürücü de bizim yaptığımızı yapıyor olabilir. Bu durumda mesela şu ihtimal oluşabilir: biz henüz listeye ulaşıp o listeyi incelemeden önce, işletim sistemi kuyruktaki tüm iş öğelerini işler, bu nedenle geliştirdiğimiz sürücü iş öğelerini listelemeye çalıştığı zaman bize boş bir liste döner. Peki bundan nasıl korunabiliriz? Cevap: kilitleme yaparak. Peki nasıl yapacağız?

{:.dikkat}
Bunu yapmadan önce şu <u>ÇOK ÖNEMLİ</u> bilgiyi vereyim. Ben bu yaptıklarımı tek işlemcili bir sanal makinede yaptığım için kodu da ona göre yazdım. Çoklu işlemcili sistemde işler birazcık değişir. Nasıl olduğuna bu yazıda pek değinmeyeceğim fakat aslında çoklu işlemcide de kilitlenmeyi sağlamak oldukça kolay, sadece biraz daha kod gerekiyor.

Tekli işlemcide ise çözüm şöyle, ya da öncelikle sorunu hatırlayalım. Bir kritik veri yapısı var, ve buraya birtakım erişimler oluyor. Biz istiyoruz ki bir süreliğine bizden başka kimse buraya erişemesin, bize bir ayrıcalık sağlansın. Bu durumda ne olmalı? Sistemde o an işleyen tek işlem biz olmalıyız. Hmm, peki işletim sistemi ne yapıyor? İşlemler arası değişim. O zaman işlemler arası değişimi engellememiz gerek. Bunu nasıl yapabiliriz? Şunu bilmeliyiz: işletim sisteminin işlemcik değiştirme mekanizması 2. IRQL seviyesinde çalışır, yani `DISPATCH_LEVEL`'da. Eğer IRQL'yi bu değere çıkarırsak işletim sistemi artık işlemcik değişimi yapamaz. Bu da söz konusu kritik yapıya yalnızca bizim erişmemize izin verir. 

O zaman IRQL seviyesini `DISPATCH_LEVEL`'a çıkartalım. Bunun için iş öğelerinin eklendiği ve listelendiği kod parçacağını şu şekilde kaplıyoruz.

	//
	// İş öğelerinin listesine erişmeden önce eşzamanlama yapmamız
	// gerek. Aksi durumda sorunlar meydana gelebilir. Mesela işlemci
	// öyle hızlıdır ki, biz listeyi taramadan o rutinleri çalıştırıp
	// iş öğelerini listeden silebilir.
	//
	// DPC seviyesinde (DISPATCH_LEVEL) işlemcik değişimi olmayacağı
	// için ciddi istisnalar hariç yalnızca bizim kodumuz çalışacak.
	//
	// **ÖNEMLİ NOT**: IRQL'nin DISPATCH seviyesinde olması yalnızca
	// tek işlemcili sistemlerde eşzamanlamaya izin verecektir! Eğer
	// çok işlemcili bir sistemde çalıştıracaksanız kod hatalı olur!
	// İlla da çalıştırmak istiyorsanız, her çekirdeğe bir adet DPC
	// gönderip, onları döngü kilit ile beklemeye alabilirsiniz.
	//
    KIRQL eskiIrql;
    eskiIrql = KeRaiseIrqlToDpcLevel();

    // iş öğelerinin eklenmesi ve listelenmesi

    //
	// Kritik yapiya erişmeyi bitirdiğimize göre
	// IRQL seviyesini tekrar eski duruma çekebiliriz
	//
    KeLowerIrql(eskiIrql);

Bu sayede kilitlemeyi sağlamış oluyoruz. Dilerseniz bu kısmı silip tekrar deneyebilirsiniz. Muhtemelen iş öğelerini göremeyeceksiniz çünkü sizin kodunuz incelemeyi yapmadan önce işletim sistemi iş öğelerini işlemiş olacak...

Çoklu işlemcide ise her işlemci ayrı bir işlemciği çalıştırdığı ve kendi işlemciklerini değiştirdiği için tüm işlemcilerin kilitlenmesi gerekiyor. Bunu işletim sistemindeki *DPC* ve *döngü kilitleri* (spin lock) kullanarak yapıyoruz. Basitçe yapılması gereken şey bizim çalıştığımız işlemci dışındakilere bir DPC gönderip, o işlemcileri döngü kilit içerisine almak ve işimiz bitene kadar orada tutmak. Bununla ilgili bir yazı da dilerseniz yazarım fakat bu yazı için gerek yok...

## Sonuç
Tüm bunların sonucunda geliştirdiğimiz sürücü bize aşağıdaki çıktıyı veriyor çok şükür:

    Sürücü başladı. 
    ExWorkerQueue adresi tespit edildi: 82b78580 
    1  (Kritik) WorkQueueItem: [860D20C0] Rutin: [967EC282] Parametre: [00000000] 
    2  (Kritik) IoQueueItem: [872740D0] (Sürücü : 87027038) Rutin: [82C5E792] Parametre: [872740D0] 
    1  (Gecikmeli) WorkQueueItem: [860C5C68] Rutin: [967EC282] Parametre: [00000000] 

Kaynak kodların son halini [şuradan](yarınyuklenecekuyumaliyim) indirebilirsiniz.

Sevgi ve selamlar
