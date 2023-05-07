module.exports = {
  singleQuote: false,
  semi: true,
  trailingComma: 'all',
  plugins: [require('@trivago/prettier-plugin-sort-imports')],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
}
