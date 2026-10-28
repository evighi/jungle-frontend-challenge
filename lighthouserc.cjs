module.exports = {
    ci: {
        collect: {
            url: [
                "http://127.0.0.1:4173/",
                "http://127.0.0.1:4173/nft/1",
            ],
            numberOfRuns: 3,
        },
        upload: {
            target: "filesystem",
        },
    },
};