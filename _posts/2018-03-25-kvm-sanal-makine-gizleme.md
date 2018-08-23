---
title: KVM sanal makine gizleme
---

Selamlar. Bir süredir bilgisayarımdaki taban işletim sistemi olarak tekrar Linux kullanmaya başladım. Her ne kadar esas olarak Windows ile uğraşıyor olsam da Linux'un kullananı devingen bir halde tutuyor oluşu her zaman hoşuma gitmiştir. Fakat Windows ile ilgili uğraşlarımı devam ettirebilmek için mecburen Windows bir sanal makineye de ihtiyaç duyuyorum.

Windows kullanırken sanallaştırma için değiştirilmiş bir VMware kullanıyordum. Değiştirilmişten kastım şu, zararlı yazılım analizi yaptığım Windows makinelerin zararlı yazılımlar tarafından "sanal" bir makine olduğunun anlaşılmaması gerekiyor. Bunu tam anlamıyla yapabilmek için de VMware'nin bazı dosyalarını değiştirmek gerekiyor. Bu değişikler sayesinde şimdiye kadar sanal makinemi tespit edebilen hiçbir zararlı yazılım olmadı. Tabi tespit edilse bile atlatmak zor değil fakat işin hızlanması açısından bu ince ayrıntılar önemli...

Linux üzerinde de acaba VMware mi kullansam diye düşünüp forumları gezerken birden aklıma VirtualBox kullanmak düştü. Onu indirip kendi testlerimi yaptım fakat sanal makineyi gizlemek için yapmam gereken şeyler canımdan bezdirdi. VMware'de her temiz kurulumda kendi dosyalarımı fabrika çıkışı olanlarla değiştirip işi götürüyordum ama VirtualBox bana çile gibi geldi. Açık kaynak olduğu için kodu düzenleyip kullanabilirdim ama ortaya çıkacak sorunlar için koda hakim olmam lazımdı, bu da zaman demekti ve açıkçası şu an için ona zaman harcamak benim için pek iyi bir fikir değil. Ama belki de bir yaz eğlencesi olarak yapabilirim bunu.

Devamında aklıma "*yahu ben neden KVM[^1] kullanmıyorum?*" diye bir soru düştü. Daha önce kullanmıştım ve özellikle performansından oldukça memnun kalmıştım. Hemen KVM modüllerini ve "*libvirt*" kütüphanesini yükleyip arayüz olarak da virt-manager[^2] kurdum. Bu arada not düşeyim, Windows kurduğunuzda "*Virtio*" sürücülerini kullanırsanız performans açısından gözle görülür fark elde edebiliyorsunuz. İlgisi olan var ise bu konuda da bir kısa yazı karalayabilirim.

Windows kurulumu, güncellemelerin yapılmasının ardından geriye sadece bu sanal makinenin gizlenmesi kalıyor. Burada da açık kaynağın güzelliğini kullanıp direkt kodu değiştirebilirdim fakat çok şükür ki geliştiriciler bu tür bir gizlemeye ihtiyaç duyan insanları düşünüp bu özelliği eklemişler. Yanılmıyorsam direkt bu amaç için değil, "*NVIDIA*" ekran kartlarının "*PCI*" direkt yönlendirme yöntemiyle sanal makinede kullanılması sırasında ortaya çıkan bir sorun için eklemişler. Görünüşe göre NVIDIA bir sebepten ötürü ekran kartlarının direkt olarak sanal makineden kullanılmasını pek istemiyor.

Peki bu gizlemeyi nasıl yapacağız? Çok basit. Eğer kullananlarınız varsa biliyordur **libvirt** oluşturulan sanal makinelerin ayarlarını `/etc/libvirt/qemu/` dizini altında XML[^3] dosyası olarak tutuyor. Biz bu dosyada bir iki ufak tefek değişiklikle sanal makinemizi gizleyebiliyoruz. Ha, bu arada sanal makinelerin tespiti esnasında kullanılan bir çok yöntem var. Burada bahsettiğim eklemeler sanal makinenin donanımsal olarak dışavurumunun önüne geçiyor. Diğer yöntemlerde mesela "*SCSI*" aygıtlarının isimleri, bellek boyutu, üretici isimleri gibi değişkenler de kullanılıyor. KVM'de bunlar sorun çıkarmıyor fakat çıkarsa bile bunları da istediğimiz şekilde değiştirebiliyoruz.


### XML dosyasına eklenecekler

Çok laf yaptık, şimdi kısacık sürecek işleme geçelim. XML dosyasında bazı etiketler var ve bu etiketlere eklemeler yapmamız lazım. `<features>` ve `<cpu>` etiketleri bu yazıda ekleme yapmamız gereken etiketler. Eğer bu etiketlerin içerisinde kendiniz ne işe yaradığını bildiğiniz bir değişiklik yapmamışsanız, bunları aşağıdaki gibi değiştirdiğinizde sanal makineniz artık tespit için kullanılan birkaç yöntemi atlatmış olacak. Eğer bu etiketler arasında zaten bir şeyler var ise, sizin dosyanızda bulunmayan fakat aşağıda bulunanları da eklemeniz yeterli olacaktır.

```xml
<features>
    <hyperv>
      <vendor_id state='on' value='Bek0'/>
    </hyperv>
    <kvm>
      <hidden state='on'/>
    </kvm>
</features>

<cpu mode='host-passthrough' check='none'>
    <feature policy='disable' name='hypervisor'/>
</cpu>
```

Kendime de not olması için kısaca özetlersem, **cpu** etiketi ile yaptığımız değişiklik, sayesinde birincisi(*host-passthrough*) bilgisayarınızda olan işlemcinin bilgilerini sanal makinenin işlemcisini oluştururken aynen kullanıyor. Böylece sanal makine işlemci olarak sizin fiziksel bilgisayarınızda olan işlemciyi görmüş oluyor. Bir diğer etiket içerisindeki "*hypervisor disable*" elemanı ise sanal makine bilgisinin `cpuid` makine komutuyla alınmasını engelliyor. Aslında engellemekten ziyade geriye yanıltıcı bilgi dönüyor desek daha doğru olur. Burada kullanılabilecek başka değerler de var, bunları `/usr/share/libvirt/cpu_map.xml` dosyasında bulabilirsiniz.

**features** etiketinde de iki ekleme var. Bunlardan `hyperv` etiketi içerisinde olan arkadaş, `cpuid` makine komutuyla elde edilen "*hypervisor*" tanımlayıcı kelimeyi değiştiriyor. Misal VirtualBox'da bu "VBox" olarak dönüyor. Ben burada diyorum ki sen geriye "*Bek0*" dön. Bu sayede bazı önceden belirli değerleri kontrol ederek sanal makine olup olmadığını test eden kodlar bunun bir sanal makine olmadığını sanıyor.

Diğer değişiklik olan "*kvm hidden state*" elamanı[^4] ise sanal makinenin MSR kullanarak tespitini engelliyor. Aşağıda verdiğim yamayı incelerseniz bu yama Qemu[^5]'ya `kvm=off` isimli bir parametre gönderilmesini sağlıyor. Aslında bu yazıda `kvm=off` parametresini verdiğimizde Qemu'nun iç mekanizmasında ne gibi değişiklikler olduğunu da anlatacaktım fakat hem bu blogda kısa yazılar da yazabileceğimin farkına varmam, hem de havanın oldukça güzel olmasından ötürü bunu okuyucuya bir çalışma olarak bırakıyorum hehe.

Şimdilik bu kadar ileride KVM ile ilgili birkaç yazı daha yazmayı düşünüyorum fakat ne kadar ileride orası meçhul...

Sevgiler

[^1]: [Kernel Based Virtual Machine](https://www.linux-kvm.org/page/Main_Page)
[^2]: [Virt Manager](https://virt-manager.org)
[^3]: [XML](https://tr.0wikipedia.org/wiki/XML)
[^4]: Meraklılar için yama [adresi](https://www.redhat.com/archives/libvir-list/2014-August/msg00744.html)
[^5]: [Bir tür emülatör](https://www.qemu.org)
