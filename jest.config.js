module.exports = {
     preset: "ts-jest",
     testEnvironment: "node",
     roots: ["<rootDir>/src/", "<rootDir>/tests/"],
     testMatch: ["**/*.test.ts"],
     transform: {
       "^.+\\.tsx?$": ["ts-jest", {
         tsconfig: "tsconfig.json",
       }],
     },
     moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
     verbose: true
   };
