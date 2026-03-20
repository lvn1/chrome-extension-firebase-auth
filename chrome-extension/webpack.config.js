const path = require('path'),
 CopyWebpackPlugin = require('copy-webpack-plugin'),
 HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: {
    background: './src/background/background.js',
    popup: './src/popup/popup.js',
  },
  mode: 'development',
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
 module: {
    rules: [
      {
        test: /\.js$/,
        // This tells Webpack to automatically handle ESM vs CommonJS
        // based on the presence of 'import' or 'require'
        type: 'javascript/auto', 
        resolve: {
          // This ensures that 'import' works even if the file 
          // doesn't have a .js extension in the code
          fullySpecified: false, 
        },
      },
    ],
  },
  resolve: {
    // FIX: Ensures Webpack picks the ESM version of Firebase
    mainFields: ['module', 'main'],
    extensions: ['.js', '.mjs']
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "src", "popup", "popup.html"),
      filename: "popup.html",
      chunks: ["popup"]
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: './public/' }
      ],
    }),
  ],
  devtool: 'cheap-module-source-map',
};
