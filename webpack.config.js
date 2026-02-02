const webpack = require('webpack');
const path = require("path");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");

module.exports = {
    entry: {
        contributionsHub: "./scripts/contributionsHub.tsx",
        contributionsWidget: "./scripts/contributionsWidget.tsx",
        contributionsWidgetConfiguration: "./scripts/contributionsWidgetConfiguration.tsx"
    },
    output: {
        libraryTarget: "amd",
        path: path.resolve(__dirname, "dist"),
        filename: "[name].js"
    },
    externals: [{
        "q": true,
        // Note: React 18 is bundled, not using host's React 16
    },
        /^TFS\//, // Ignore TFS/* since they are coming from VSTS host
        /^VSS\//  // Ignore VSS/* since they are coming from VSTS host
    ],
    resolve: {
        extensions: [".ts", ".tsx", ".js"],
    },
    devtool: "source-map",
    plugins: [
      new BundleAnalyzerPlugin({
        openAnalyzer: false,
        reportFilename: "bundle-analysis.html",
        analyzerMode: "static"
      })
    ],
    module: {
      rules: [
        // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
        {
          test: /\.tsx?$/,
          loader: "ts-loader",
          exclude: [/__tests__/, /node_modules/]
        }
      ]
    }
};
