!macro NSIS_HOOK_POSTUNINSTALL
  ReadRegStr $0 HKCU "Software\Classes\.mastercanvas" ""
  StrCmp $0 "" 0 +2
    DeleteRegKey HKCU "Software\Classes\.mastercanvas"

  ReadRegStr $0 HKCU "Software\Classes\.mcproject" ""
  StrCmp $0 "" 0 +2
    DeleteRegKey HKCU "Software\Classes\.mcproject"
!macroend
