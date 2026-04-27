}

finalize_modified_archive() {
  local action="$1"

  case "${action}" in
    apply)
      if ! ensure_archive_backup; then
        return 1
      fi
      ;;
  esac

  if ! pack_temp_app_to_asar; then
    return 1
  fi

  if ! update_asar_integrity_metadata; then
    return 1
  fi

  if ! resign_app_bundle "Codex.app resources were modified. Re-signing now."; then
    return 1
  fi

  return 0
}

run_embedded_tool() {
  local action="$1"
  local exit_code=1

  print_action_header "${action}"

  if ! validate_action_request "${action}"; then
    return 1
  fi

  if [ "${action}" = "restore" ] && [ -f "${APP_ASAR_BACKUP}" ]; then
    restore_from_archive_backup
    return $?
  fi

  if ! unpack_app_asar_to_temp; then
    return 1
  fi

  run_embedded_patcher "${action}"

  exit_code=$?

  if [ "${exit_code}" -eq 0 ] && [ "${action}" != "status" ]; then
    if ! finalize_modified_archive "${action}"; then
      exit_code=1
    fi
  fi

  cleanup_temp_workspace

  print_line ""
  print_line "Exit code: ${exit_code}"
  return "${exit_code}"
}

show_menu() {
  clear
  print_line "Codexfast"
  print_line "Target: ${APP_RESOURCES}"
  print_line "Note: this .sh file is fully self-contained and can be shared on its own."
  print_line "A local ad-hoc re-sign runs automatically after resource changes."
  print_line ""
  print_line "1) View current status"
  print_line "2) Enable custom API features"
  print_line "3) Restore original state"
  print_line "q) Quit"
  print_line ""
  printf 'Choose an option: '
}

main() {
  if ! check_requirements; then
    print_line ""
    printf 'Press Enter to close...'
    read -r _
    exit 1
  fi

  while true; do
    show_menu
    read -r choice

    case "${choice}" in
      1)
        run_embedded_tool "status"
        pause
        ;;
      2)
        run_embedded_tool "apply"
        pause
        ;;
      3)
        run_embedded_tool "restore"
        pause
        ;;
      q|Q)
        exit 0
        ;;
      *)
        print_line ""
        print_line "Invalid option: ${choice}"
        pause
        ;;
    esac
  done
}

main "$@"
