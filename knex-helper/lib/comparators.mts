export enum comparators {
  EQ = 'EQ',
  GT = 'GT',
  LT = 'LT'
}

export const comparatorsMap = new Map<string, string>()
comparatorsMap.set(comparators.EQ, '=')
comparatorsMap.set(comparators.GT, '>')
comparatorsMap.set(comparators.LT, '<')
