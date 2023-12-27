import React, { PropsWithChildren } from "react"
import UAParser from "ua-parser-js"

const getBrowserInfo = () => {
  const parser = new UAParser()
  const result = parser.getResult()
  return result
}

interface CommonProps {
  // add other props here if needed
}

const Common: React.FC<PropsWithChildren<CommonProps>> = ({
  children,
  ...props
}) => {
  const browserInfo = getBrowserInfo()

  const isSafari = browserInfo.browser.name === "Safari"

  return (
    <div className="flex flex-1 flex-col h-full" {...props}>
      {!isSafari ?
        children
      : <div className="flex flex-1 flex-col justify-center items-center gap-4">
          <p className="text-[40px] font-bold">🙏</p>
          <p className="max-w-[500px] text-center">
            Unfortunately, Safari has some non-standard "quirks" with advanced
            browser features, like IndexedDB, so during Conductor Beta, Safari
            is not supported.
          </p>
          <p className="max-w-[500px] text-center">
            Please try with Chrome or any Chromium-based browser.
          </p>
        </div>
      }
    </div>
  )
}

export default Common
