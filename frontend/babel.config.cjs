module.exports = {
  presets: [
    ['@babel/preset-env', { targets: 'defaults' }],
    ['@babel/preset-react', { runtime: 'automatic' }]
  ],
  plugins: [
    "@babel/plugin-transform-modules-commonjs"
  ]
};
