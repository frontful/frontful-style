import PropTypes from 'prop-types'
import React from 'react'
import {styleManager} from '../style'

class StyleManager extends React.PureComponent {
  componentWillMount() {
    this.sessionStyleManager = this.props.sessionStyleManager || styleManager.getSession()

    if (this.props.globalStyle) {
      this.style = this.sessionStyleManager.getInstance(this.props.globalStyle)
    }
  }

  static childContextTypes = {
    sessionStyleManager: PropTypes.any
  }

  getChildContext() {
    return {
      sessionStyleManager: this.sessionStyleManager
    }
  }

  render() {
    return React.Children.only(this.props.children)
  }

  componentWillUnmount() {
    if (this.props.globalStyle && this.style) {
      this.style.dispose()
    }
  }
}

export default StyleManager
