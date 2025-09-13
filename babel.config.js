module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: '.env',
          safe: false,           // set to true if you want to enforce all vars exist
          allowUndefined: true,  // prevents errors if a var is missing
          verbose: false,        // optional: logs dotenv issues during build
        },
      ],
      'react-native-worklets/plugin',
    ],
  };
};
