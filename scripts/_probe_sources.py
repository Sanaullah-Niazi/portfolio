# Temporary: checks candidate sources from a GitHub runner (robots.txt, status, how many entries). Removed before merge.
import re, sys, urllib.request, urllib.robotparser, urllib.parse
UA = "Mozilla/5.0 (compatible; sanaullahniazi.com scholarships bot; +https://sanaullahniazi.com/scholarships/)"
K = "cyber+security"
C = [
 "https://jobs.sciencecareers.org/jobs/?display=rss&keywords=" + K,
 "https://jobs.newscientist.com/jobs/?display=rss&keywords=" + K,
 "https://jobs.chronicle.com/jobs/?display=rss&keywords=cybersecurity",
 "https://careers.insidehighered.com/jobs/?display=rss&keywords=cybersecurity",
 "https://www.nature.com/naturecareers/jobs/?display=rss&keywords=" + K,
 "https://jobs.acm.org/jobs/?display=rss&keywords=security",
 "https://jobs.ieee.org/jobs/?display=rss&keywords=security",
 "https://jobs.acm.org/jobs/rss/?keywords=security",
 "https://academicjobsonline.org/ajo/rss",
 "https://academicjobsonline.org/ajo/jobs?rss",
 "https://www.higheredjobs.com/rss/articleFeed.cfm",
 "https://www.jobs.ac.uk/search/?keywords=cyber+security&format=rss",
 "https://www.jobs.ac.uk/jobs/computer-sciences/?format=rss",
 "https://www.jobs.ac.uk/feeds/subject-areas/computer-sciences",
 "https://jobrxiv.org/?feed=job_feed&search_keywords=security",
 "https://www.jobbnorge.no/en/rss?keywords=security",
 "https://www.universityaffairs.ca/feed/?post_type=job",
 "https://www.academics.de/rss",
 "https://www.helmholtz.de/en/career/job-offers/rss/",
 "https://jrecin.jst.go.jp/seek/SeekJorSearch?fn=4&rss=1",
 "https://www.mpg.de/feeds/jobs.rss",
 "https://www.cnrs.fr/en/rss/jobs",
 "https://www.ethz.ch/en/the-eth-zurich/working-teaching-and-research/jobs.rss",
 "https://www.tudelft.nl/en/about-tu-delft/working-at-tu-delft/search-jobs/rss",
 "https://www.kuleuven.be/personeel/jobsite/jobs/rss",
 "https://opportunitiescorners.com/?s=cyber+security&feed=rss2",
 "https://www.afterschoolafrica.com/?s=cyber+security&feed=rss2",
 "https://www.scholarshipsads.com/?s=cyber+security&feed=rss2",
 "https://scholarshiproar.com/?s=cyber+security&feed=rss2",
 "https://www.mladiinfo.eu/?s=cyber+security&feed=rss2",
 "https://www.studyportals.com/feed/",
 "https://infosec-jobs.com/feed/",
 "https://www.usajobs.gov/Search/Results?k=cybersecurity+student",
 "https://www.lmu.de/en/about-lmu/working-at-lmu/job-portal/rss",
 "https://www.tum.de/en/about-tum/working-at-tum/open-positions/rss",
 "https://euraxess.ec.europa.eu/jobs/search?keywords=security",
 "https://www.phdportal.com/",
 "https://www.academicpositions.com/",
 "https://scholarship-positions.com/?s=cyber+security&feed=rss2",
 "https://www.scholarshipportal.com/",
 "https://www.wemakescholars.com/",
 "https://www.postdocjobs.com/",
 "https://www.mastersportal.com/",
 "https://www.timeshighereducation.com/unijobs/jobsrss/?keywords=phd",
 "https://www.ercim.eu/news/rss",
 "https://ellis.eu/news.rss",
 "https://www.cispa.de/en/jobs/rss",
 "https://careers.epfl.ch/rss",
 "https://www.uni-saarland.de/rss",
 "https://jobs.ethz.ch/rss",
 "https://www.ox.ac.uk/feeds/rss-jobs",
 "https://www.cam.ac.uk/jobs/rss",
 "https://www.imperial.ac.uk/jobs/rss/",
 "https://www.ucl.ac.uk/work-at-ucl/rss",
 "https://www.ed.ac.uk/jobs/rss",
]
for url in C:
    host = "{0.scheme}://{0.netloc}".format(urllib.parse.urlsplit(url))
    rp = urllib.robotparser.RobotFileParser()
    try:
        r = urllib.request.urlopen(urllib.request.Request(host + "/robots.txt", headers={"User-Agent": UA}), timeout=20)
        rp.parse(r.read().decode("utf-8", "replace").splitlines()); rob = "allow" if rp.can_fetch(UA, url) else "DISALLOW"
    except Exception as e:
        rob = "robots:" + type(e).__name__ + str(getattr(e, "code", ""))
    try:
        r = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/rss+xml, application/xml, text/html;q=0.8, */*;q=0.5"}), timeout=25)
        body = r.read(3_000_000).decode("utf-8", "replace")
        n = len(re.findall(r"<item[\s>]|<entry[\s>]", body))
        titles = [re.sub(r"<!\[CDATA\[|\]\]>|<[^>]+>", "", t).strip()[:70] for t in re.findall(r"<title[^>]*>(.*?)</title>", body, re.S)[1:4]]
        print(f"{rob:10} {r.status} {r.headers.get('content-type','')[:24]:24} items={n:3} {url}\n      {titles}")
    except Exception as e:
        print(f"{rob:10} ERR {type(e).__name__} {getattr(e,'code','')} {url}")
    sys.stdout.flush()
