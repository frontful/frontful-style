function fork(object, props) {
  return Object.create(object, Object.keys(props).reduce((definition, key) => {
    definition[key] = {
      writable: true,
      enumerable: true,
      value: props[key],
    }
    return definition
  }, {}))
}

export default fork
