---
title: UPX Manuel Olarak Unpack Etmek
---

UPX birkaç çalıştırılabilir dosya formatını destekleyen küçük boyutlu bir pack yazılımıdır. Bu yazıda UPX ile paketlenmiş bir çalıştırılabilir dosyayı manuel olarak unpack etmeyi göstermeye çalışıcam.

UPX bir dosyayı pack ettikten sonra bu dosyanın çalışması sırasında kendini tekrar unpack eden instructionları bu dosya içine yazıyor. Bu yazıda bizim yapacağımız şey, bu unpack adımlarını takip ederek dosyanın manuel olarak unpack edilmesini sağlamak, ve ardından dosyayı o şekilde tekrar kaydetmek olacak. Tersine mühendislik, binary inceleme, zararlı yazılım analizi gibi alanlarda araştırma yapanların genellikle bilmesi gereken basit konulardan biri bu. Genel olarak bu yazılımı kullananlar yazdıkları zararlı yazılımı AV ve Anti-Spyware gibi programlardan saklamak için, yahut dosyanın boyutunu küçültmek için kullanıyorlar.

Teorik olarak UPX, çalıştırılabilir dosyanın içerisinde bulunan sectionları (.text, .bss gibi) paketleyerek sırayla isimlerini UPX0, UPX1 ... devam edecek şekilde yeniden isimlendirir. Ardından code sectionın sonuna bu pack edilmiş bölümleri unpack eden, ayrıca **IAT**(Import Address Table) tablosunu düzelten bir kod yerleştirir. Son olarak programın **OEP** adresini bu unpack kodunun başlangıcı olarak yeniden değiştirir.

Bu unpack aşaması basit olarak şu şekilde gerçekleşir:

* `PUSHAD` instructionını ile tüm registerlar saklanır.
* Tüm bölümler unpack kodu ile unpack edilir.
* **IAT** tablosu doğru haline getirilir.
* `POPAD` instructionı ile tüm registerler eski değerlere yüklenir.
* Klasik bir **JMP** instructionı ile asıl **OEP** adresine dallanılır.

## UPX ile Paketleme
Paketlemek için bir işe yaramayan mahzun bir C programı kodu aşağıdaki gibidir.

    /**************************
    *   beniupxlediler.c
    ***************************/

    int main(){
        printf("Meraba, elemanin biri UPXledi beni, bi el atsan ?\n");
        system("pause");
        return 0;
    }

Bu kodu derledikten sonra [upx](http://upx.sourceforge.net/)'in adresinden UPX'i indirip bir klasöre çıkarıyoruz. Ardından derlediğimiz dosyayı da aynı klasöre alıp `upx.exe -9 beniupxlediler.exe` ile çalıştırılabilir dosyayı pack ediyoruz. Ya da belkide pack daha doğru olabilir, bilemedim. -1 ile -9 arasında bir değer verebilirsiniz. 9'a yaklaştıkça sıkıştırma kalitesi artacaktır.

    C:\bekbek>upx.exe -9 beniupxlediler.exe
                           Ultimate Packer for eXecutables
                              Copyright (C) 1996 - 2013
    UPX 3.91w       Markus Oberhumer, Laszlo Molnar & John Reiser   Sep 30th 2013

            File size         Ratio      Format      Name
       --------------------   ------   -----------   -----------
        103533 ->     55917   54.01%    win32/pe     beniupxlediler.exe

    Packed 1 file.

Dosya pack edildikten sonra isterseniz dosyanıza *PEID* yahut *DIE* ile bakarak farkı görebilirsiniz. 

![](/files/dieupxbak.png)

Şimdi unutmadan araya packlenmemiş dosyanın **OEP**'inde bulunan kodları görelim. 

![](/files/oepdisas.png)

## Unpack İşlemi
Packlediğimiz dosyayı debuggerda açalım, bakalım nasıl bir görüntü ile karşılaşacağız.

![](/files/debugupxoep.png)

Görüldüğü gibi program farklı bir **OEP** ile açıldı, buradaki kodlar UPX'in unpack için kollandığı kodlar. Görüldüğü gibi öncelikle bir `PUSHAD` ile registerler kayıt ediliyor. Bu kısımda debuggerda stack kısmını kontrol ederseniz register değerlerini görebilirsiniz. Geri kalan kısımlarda bahsettiğimiz gibi packlenen sectionlar unpack edilip **IAT** düzeltiliyor. Şimdi bizim yapmamız gereken şey unpack işlemi bittiği kısma gelebilmek. Bunun için küçük bir ipucundan yararlanıyoruz. Ne demiştik ? Unpack edildikten sonra `POPAD` ile registerler eski değerlere yükleniyordu. Öyleyse **61** opcodelu `POPAD` instructionınını bulalım.

![](/files/popaddebugger-1.png)

Görüldüğü gibi `POPAD` ile register değerleri eski haline getirilmiş. Ardından stackden EAX registerı yardımıyla 0x80 byte çıkarılıyor. Bizi ilgilendiren kısım son instruction olan **JMP**. Bu jump bizi gerçek **OEP**'e dallandıracak.

![](/files/jmpgeldiktensonra.png)

Dikkat ederseniz bu başlarda gösterdiğim **OEP**'in dissassembly kısmı ile aynı. Bu demektir ki doğru yerdeyiz. Şimdi bu kısımda daha ilerlemeden programı debugger aracılığıyla dump ediyoruz. (Sağ tık menüsünde var, yoksa dump plugini yüklemeniz gerek.) Burada Rebuild İmport kutucuğunun başındaki tiki kaldırmayı unutmayın, biz bunu farklı bir programla yapacağız.

![](/files/debugdumpet.png)

Dump butonu ile yeni halini kaydediyoruz. Ayrıca **Entry Point** kısmındaki yeni değeri (1500) not ediyoruz. Şimdi unpack etmediğimiz dosyayı IMPRec ile açıyoruz. 

![](/files/imprec.png)

Ardından öncelikle **OEP** kısmına kopyaladığımız **OEP**'i yazıp yanındaki **IAT AutoSearch** butonuna tıklıyoruz. Sonra **Get Imports** butonu ile Importları alıyoruz. Ben Importları aldıktan sonra iki adet göründü, minik bir program olduğu için burada geçerli olmayan bir import gözükmemekte. Bazı durumlarda geçersiz importlar olabilir. Bu durumda yanında **Valid:NO** yazan importların üzerine sağ tıklayıp **Delete Trunk**'a basabilirsiniz. Son olarak **Fix Dump** butonuna basarak dosyayı kaydediyoruz. Dikkat etmeniz gereken nokta **IMPRec** ile açtığımız dosya unpack etmediğimiz dosya, **Fix Dump** butonu ile üzerine yazdığımız dosya ise dump ettiğimiz dosya olmalı, aksi taktirde unpack başarılı olmayacaktır. Sırası gelmişken minik programımızdaki pause kullanmamızın sebebi buydu, çünkü yalnızca bir mesaj verip kapandığı için **IMPRec** onu yakalayamıyordu, bu nedenle bir pause çalıştırıp biz bir tuşa basana dek çalışmasını sağladık.

Genellikle kullanılan analiz yazılımlarının çoğu UPX'i otomatik olarak unpack edebiliyor olsa da, bu işlemin manuel olarak nasıl yapıldığını öğrenmenin paketleme mantığını anlayabilmek adına yararlı olacağını düşündüm. Umarım yararlı olmuştur.
