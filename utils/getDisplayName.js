export default function getDisplayName(Component) {
  return (Component && (Component.displayName || Component.name)) ||  'Component'
}
