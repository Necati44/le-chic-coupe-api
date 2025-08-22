/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // 1) Pas de cycles
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    // 2) Les controllers ne doivent PAS importer Prisma (couche data)
    {
      name: 'no-controller-to-prisma',
      severity: 'error',
      from: { path: 'src/.+\\.controller\\.ts$' },
      to:   { path: 'src/prisma/.*' },
    },
    // 3) Personne ne doit importer un controller (les controllers sont les feuilles)
    {
      name: 'no-importing-controllers',
      severity: 'error',
      from: { path: '^src/', pathNot: '\\.module\\.ts$' },
      to:   { path: '\\.controller\\.ts$' },
    },
  ],
  options: {
    // Résout les alias TS (@common, @prisma, etc.)
    tsConfig: { fileName: 'tsconfig.json' },

    // Ignore node_modules, d.ts et tests
    doNotFollow: { path: 'node_modules|\\.d\\.ts$' },
    exclude:     { path: '^test/|\\.spec\\.ts$' },

    // Sortie ‘dot’ plus compacte si tu génères un graphe
    reporterOptions: {
      dot: { collapsePattern: 'node_modules/[^/]+|src/[^/]+' }
    },
  },
};
