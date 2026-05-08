// Webcam links per beach. Sourced directly from njbeachcams.com (Coastal Camera Network).
// All URLs verified live as of scrape. If any 404 later, just delete that line.

const WEBCAMS = {
  'sea-bright':       'https://njbeachcams.com/central-new-jersey/sea-bright-nj-webcam/',
  'monmouth-beach':   'https://njbeachcams.com/northern-new-jersey/monmouth-beach-webcam/',
  'long-branch':      'https://njbeachcams.com/northern-new-jersey/long-branch-webcam/',
  'deal':             'https://njbeachcams.com/northern-new-jersey/deal-live-cam/',
  'asbury-park':      'https://njbeachcams.com/central-new-jersey/asbury-park-webcam/',
  'belmar':           'https://njbeachcams.com/central-new-jersey/belmar-webcam/',
  'spring-lake':      'https://njbeachcams.com/central-new-jersey/spring-lake-webcam/',
  'manasquan':        'https://njbeachcams.com/central-new-jersey/manasquan-inlet-cam/',
  'point-pleasant':   'https://njbeachcams.com/central-new-jersey/point-pleasant-beach-webcam/',
  'bay-head':         'https://njbeachcams.com/central-new-jersey/bay-head-surf-cam/',
  'lavallette':       'https://njbeachcams.com/central-new-jersey/lavallette-webcam/',
  'seaside-heights':  'https://njbeachcams.com/central-new-jersey/seaside-heights-boardwalk-webcam/',
  'seaside-park':     'https://njbeachcams.com/central-new-jersey/seaside-park-webcam/',
  'harvey-cedars':    'https://njbeachcams.com/central-new-jersey/harvey-cedars-webcam/',
  'surf-city':        'https://njbeachcams.com/central-new-jersey/surf-city-webcam/',
  'ship-bottom':      'https://njbeachcams.com/central-new-jersey/ship-bottom-surf-cam/',
  'atlantic-city':    'https://njbeachcams.com/southern-new-jersey/atlantic-city-webcam/',
  'ocean-city':       'https://njbeachcams.com/southern-new-jersey/ocean-city-beach-cam/',
  'sea-isle-city':    'https://njbeachcams.com/southern-new-jersey/sea-isle-city-webcam/',
  'avalon':           'https://njbeachcams.com/southern-new-jersey/avalon-webcam/',
  'cape-may':         'https://njbeachcams.com/southern-new-jersey/cape-may-webcam/'
};

function getWebcam(beachId) {
  return WEBCAMS[beachId] || null;
}

module.exports = { WEBCAMS, getWebcam };