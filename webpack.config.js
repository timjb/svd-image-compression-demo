const CopyWebpackPlugin = require("copy-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const path = require("path");

module.exports = {
  entry: {
    main: "./src/main-app/index.tsx",
  },
  devtool: "source-map",
  mode: "development",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: "ts-loader",
      },
    ],
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".json"],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        { context: "node_modules/slick-carousel/slick", from: "{slick,slick-theme}.css" },
        { context: "node_modules/slick-carousel/slick", from: "fonts/slick.*" },
        { context: "node_modules/nouislider/distribute", from: "nouislider.min.css" },
      ],
    }),
  ],
  experiments: {
    // this option is deprecated in favor of 'asyncWebAssembly', but unfortunately
    // 'asyncWebAssembly' doesn't work because of https://github.com/rustwasm/wasm-bindgen/issues/2343
    syncWebAssembly: true,
  },
};
