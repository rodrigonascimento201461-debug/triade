module.exports = function (api) {
  api.cache(true);
  // babel-preset-expo já inclui o suporte a expo-router (SDK 50+).
  // Não adicione 'expo-router/babel': foi removido.
  return {
    presets: [['babel-preset-expo', { jsxRuntime: 'automatic' }]],
  };
};
