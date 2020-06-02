import Events from '../../base/events'
import UICorePlugin from '../../base/ui_core_plugin'
import template from '../../base/template'
// import PlayerError from '../../components/error/'
// import { SvgIcons } from '../../base/utils'
import templateHtml from './public/error_screen.html'
import './public/error_screen.scss'
import Browser from '../../components/browser'

export default class ErrorScreen extends UICorePlugin {
  get name() {
    return 'clappr-error-handler'
  }
  get attributes() {
    return {
      class: this.name,
      [`data-${this.name}`]: ''
    }
  }
  get template() { return template(templateHtml) }
  get container() { return this.core.activeContainer }
  get playback() { return this.core.activePlayback }

  constructor(core) {
    super(core)
    const opts = this.options.clapprErrorHandler || {}
    this.quiet = !!opts.quiet
    this.retryDelay = opts.retryDelay || 20
    this.text = opts.text || 'Шествие «Бессмертный полк онлайн» завершилось.</br>Найти своих героев вы можете, выбрав необходимые дату и время показа'
    this.image = opts.image || null
    if (opts.onRetry) {
      if (typeof opts.onRetry === 'function') {
        this.callBack = opts.onRetry
      } else {
        this.callBack = null
        console.error(TypeError('clapprErrorHandler.onRetry must be a function')) // eslint-disable-line
      }
    } else { this.callBack = null }

    this.$el.html(this.template(this))
    if (Browser.isMobile) this.$el.find('h2.text').css({ 'font-size': '90%' })
    this.image && this.$el.css({ 'background-image': `url(${this.image})` })
    this.$retryTimer = this.$('.retry-timer')
    if (this.options.disableErrorScreen) return this.disable()
  }

  bindEvents() {
    this.listenTo(this.core, Events.ERROR, this.onError)
    this.listenTo(this.core, Events.CORE_ACTIVE_CONTAINER_CHANGED, this.onContainerChanged)
  }

  // bindReload() {
  //   this.reloadButton = this.$el.find('.player-error-screen__reload')
  //   this.reloadButton && this.reloadButton.on('click', this.reload.bind(this))
  // }

  // unbindReload() {
  //   this.reloadButton && this.reloadButton.off('click')
  // }

  onContainerChanged() {
    // this.err = null
    this.listenTo(this.playback, Events.PLAYBACK_ERROR, this.onError)

    // this.unbindReload()
    this.hide()
  }

  onError(e = {}) {
    if (this.isErrorFatal(e)) {
      this.quiet || this.show()
      this.switchClickToPause('disable')
      let tid
      let t = this.retryDelay
      let retry = () => {
        clearTimeout(tid)
        if (t === 0) {
          this.switchClickToPause('enable')
          if (this.callBack) this.callBack(e)
          else this.restart()
          this.hide()
          return
        }
        this.$retryTimer.text(t)
        t--
        tid = setTimeout(retry, 1000)
      }
      retry()
    }
  }

  restart() {
    if (!this.container) return
    this.container.stop()
    this.container.play()
  }

  reload() {
    this.listenToOnce(this.core, Events.CORE_READY, () => this.container.play())
    this.core.load(this.options.sources, this.options.mimeType)
    // this.unbindReload()
  }

  isErrorFatal(e) {
    if (!e) return false
    if (e.level === 'FATAL') return true
    if (e.data && e.data.fatal === true) return true
  }

  switchClickToPause(method) {
    if (this.container) {
      let plugin = this.container.getPlugin('click_to_pause')
      plugin && plugin[method]()
    }
  }

  hide() {
    this.$el.remove()
  }
  show() {
    this.core.$el.prepend(this.$el)
  }

  // render() {
  // if (!this.err) return

  // this.$el.html(this.template({
  //   title: this.err.UI.title,
  //   message: this.err.UI.message,
  //   code: this.err.code,
  //   icon: this.err.UI.icon || '',
  //   reloadIcon: SvgIcons.reload,
  // }))

  // this.core.$el.append(this.el)

  // this.bindReload()

  // return this
  // }
}
