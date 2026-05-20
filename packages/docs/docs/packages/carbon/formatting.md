# Date Formatting

Format Carbon dates with various tokens.

## Format Tokens

```typescript
const date = Carbon.from('2024-01-15 14:30:00')

date.format('YYYY')      // 2024
date.format('MM')        // 01
date.format('DD')        // 15
date.format('HH')        // 14
date.format('mm')        // 30
date.format('ss')        // 00
date.format('YYYY-MM-DD') // 2024-01-15
date.format('HH:mm:ss')   // 14:30:00
```

## Common Formats

```typescript
date.format('YYYY-MM-DD HH:mm:ss')  // 2024-01-15 14:30:00
date.format('MM/DD/YYYY')           // 01/15/2024
date.format('DD MMM YYYY')          // 15 Jan 2024
date.format('dddd, MMMM Do YYYY')   // Monday, January 15th 2024
```

## Human Readable

```typescript
const past = Carbon.from('2024-01-10')
const future = Carbon.from('2024-01-20')

past.diffForHumans()   // "5 days ago"
future.diffForHumans() // "5 days from now"
```

## Next Steps

- [Manipulation](/packages/carbon/manipulation) -- Modify dates
- [Comparison](/packages/carbon/comparison) -- Compare dates
- [Intervals](/packages/carbon/intervals) -- Intervals and periods
