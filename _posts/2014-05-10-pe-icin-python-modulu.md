---
layout: post
title: PE için python Modülü
categories: Bilgisayar
---

Merhaba, daha önceki bir [yazıda](/posts/pe-basligi-ve-export-table) bahsettiğim PE dosyalar için güzel bir python modülü ile tanıştım kısaca burada da bahsetmek istiyorum belki bir yararı dokunabilir.

[pefile](https://code.google.com/p/pefile/) isimli bu modül python ile portable executable dosyaların PE bilgilerini okumak/değiştirmek için oldukça iyi bir seçim. Modülü windows üzerinde yüklemek için indireceğiniz sıkıştırılmış dosyada bulunan `pefile.py`, `peutils.py`isimli iki dosyayı ve `ordlookup` isimli klasörü `Python27/Lib` içerisine kopyalayın. Tabi versiyonunuza göre bu klasör ismi değişebilir.

Modül oldukça kullanışlı, yapabildiklerinizden bazıları web sitesinde de belirtilmiş.

* Modifying and writing back to the PE image
* Header Inspection
* Sections analysis
* Retrieving data
* Warnings for suspicious and malformed values
* Packer detection with PEiD’s signatures
* PEiD signature generation

## Kullanım
Öncelikle bir PE dosyayı import etmeniz gerekiyor.

    import pefile
    dosya =  pefile.PE('dosya.exe')

Section boyutu yüksek dosyalar için fastload isimli güzel bir seçenek de mevcut.

    dosya =  pefile.PE('dosya.exe', fast_load=True)

Dosya yüklendikten sonra hemen PE bilgilerini okuyabiliyorsunuz, örneğin:

    >>> dosya.OPTIONAL_HEADER.AddressOfEntryPoint
    4776
    >>> hex(dosya.OPTIONAL_HEADER.AddressOfEntryPoint)
    '0x12a8'
    >>> hex(dosya.DOS_HEADER.e_lfanew)
    '0xf0'
    >>> hex(dosya.DOS_HEADER.e_magic)
    '0x5a4d'
    >>> hex(dosya.NT_HEADERS.Signature)
    '0x4550'
    >>> hex(dosya.FILE_HEADER.Machine)
    '0x14c'
    >>>

Ayrıca dediğim gibi header üzerinde oynama yapabiliyorsunuz, örneğin:

    >>> dosya.FILE_HEADER.Machine = 0x1c40
    >>> dosya.write(filename='dosya_patched.exe')

Tüm bilgileri birden alabiliyorsunuz:

    print dosya.dump_info()

Import edilen fonksiyonları şu şekilde görebiliyoruz mesela:

    for entry in dosya.DIRECTORY_ENTRY_IMPORT:
      print entry.dll
      for imp in entry.imports:
        print '\t', hex(imp.address), imp.name

Sonucunda:

    python27.dll
            0x1d0020a4 Py_Main
    MSVCR90.dll
            0x1d002038 __p__commode
            0x1d00203c __p__fmode
            0x1d002040 _encode_pointer
            0x1d002044 __set_app_type
            0x1d002048 ?terminate@@YAXXZ
            0x1d00204c _unlock
            0x1d002050 _adjust_fdiv
            0x1d002054 _lock
            0x1d002058 _onexit
            0x1d00205c _decode_pointer
            0x1d002060 _except_handler4_common
            0x1d002064 _invoke_watson
            0x1d002068 _controlfp_s
            0x1d00206c _crt_debugger_hook
            0x1d002070 __setusermatherr
            0x1d002074 _configthreadlocale
            0x1d002078 _initterm_e
            0x1d00207c _initterm
            0x1d002080 __initenv
            0x1d002084 exit
            0x1d002088 _XcptFilter
            0x1d00208c _exit
            0x1d002090 _cexit
            0x1d002094 __getmainargs
            0x1d002098 _amsg_exit
            0x1d00209c __dllonexit
    KERNEL32.dll
            0x1d002000 IsDebuggerPresent
            0x1d002004 GetCurrentProcess
            0x1d002008 TerminateProcess
            0x1d00200c GetSystemTimeAsFileTime
            0x1d002010 GetCurrentProcessId
            0x1d002014 GetCurrentThreadId
            0x1d002018 GetTickCount
            0x1d00201c QueryPerformanceCounter
            0x1d002020 SetUnhandledExceptionFilter
            0x1d002024 InterlockedCompareExchange
            0x1d002028 Sleep
            0x1d00202c InterlockedExchange
            0x1d002030 UnhandledExceptionFilter

Hatta ilgimi çekti pydasm ile birleştirerek küçük bir disassembler dahi yazabiliyorsunuz.

    ep = pe.OPTIONAL_HEADER.AddressOfEntryPoint
    ep_ava = ep+pe.OPTIONAL_HEADER.ImageBase
    data = pe.get_memory_mapped_image()[ep:ep+100]
    offset = 0
    while offset < len(data):
      i = pydasm.get_instruction(data[offset:], pydasm.MODE_32)
      print pydasm.get_instruction_string(i, pydasm.FORMAT_INTEL, ep_ava+offset)
      offset += i.length

Sonuç:

    push byte 0x70
    push dword 0x1001888
    call 0x1006ca8
    xor ebx,ebx
    push ebx
    mov edi,[0x100114c]
    call edi
    cmp word [eax],0x5a4d
    jnz 0x1006b1d
    mov ecx,[eax+0x3c]
    add ecx,eax
    cmp dword [ecx],0x4550
    jnz 0x1006b1d
    movzx eax,[ecx+0x18]

Oldukça iş gören bir modül olduğunu düşünüyorum, ilerde işe yarayabilir, burada not olsun.
