function getConfig_() {
  var p = PropertiesService.getScriptProperties();
  return {
    groqApiKey: p.getProperty('GROQ_API_KEY'),
    appToken: p.getProperty('APP_TOKEN'),
    sheetId: p.getProperty('SHEET_ID'),
  };
}
