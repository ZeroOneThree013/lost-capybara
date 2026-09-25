function getConfig_() {
  var p = PropertiesService.getScriptProperties();
  return {
    geminiApiKey: p.getProperty('GEMINI_API_KEY'),
    appToken: p.getProperty('APP_TOKEN'),
    sheetId: p.getProperty('SHEET_ID'),
  };
}
